from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from uuid import uuid4
import threading
import time
import uvicorn

from .instagram import InstagramClient
from .models import SessionRequest, UnsendRequest

app = FastAPI(
    title="Instagram DM Unsender API",
    description="API for unsending Instagram DM messages",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session storage
sessions = {}
unsend_jobs = {}
active_unsend_jobs = {}
jobs_lock = threading.Lock()


def public_job(job: dict) -> dict:
    """Return a serializable public copy of an unsend job"""
    return {
        "job_id": job["job_id"],
        "thread_id": job["thread_id"],
        "status": job["status"],
        "total": job["total"],
        "processed": job["processed"],
        "unsent": job["unsent"],
        "failed": job["failed"],
        "failed_items": list(job["failed_items"]),
        "current_message_id": job.get("current_message_id"),
        "cancel_requested": job["cancel_requested"],
        "created_at": job["created_at"],
        "updated_at": job["updated_at"],
        "finished_at": job.get("finished_at"),
        "batch_size": job["batch_size"]
    }


def run_unsend_job(job_id: str) -> None:
    """Background worker for long-running unsend jobs"""
    with jobs_lock:
        job = unsend_jobs.get(job_id)
        if not job:
            return
        job["status"] = "running"
        job["updated_at"] = time.time()

    client = job["client"]
    batch_size = job["batch_size"]
    message_ids = list(job["message_ids"])

    try:
        for index, message_id in enumerate(message_ids):
            with jobs_lock:
                if job["cancel_requested"]:
                    job["status"] = "cancelled"
                    job["finished_at"] = time.time()
                    job["updated_at"] = time.time()
                    active_unsend_jobs.pop(job["session_id"], None)
                    return
                job["current_message_id"] = message_id
                job["updated_at"] = time.time()

            try:
                client.unsend_message_or_reaction(job["thread_id"], message_id)
                with jobs_lock:
                    job["unsent"] += 1
            except Exception as exc:
                with jobs_lock:
                    job["failed"] += 1
                    job["failed_items"].append({
                        "message_id": message_id,
                        "error": str(exc)
                    })

            with jobs_lock:
                job["processed"] += 1
                job["updated_at"] = time.time()

            # Per-item pacing for Instagram rate limits
            time.sleep(1)

            # Chunk boundary pause keeps very large jobs safer and visible
            if (index + 1) % batch_size == 0:
                time.sleep(2)

        with jobs_lock:
            job["status"] = "completed"
            job["current_message_id"] = None
            job["finished_at"] = time.time()
            job["updated_at"] = time.time()
            active_unsend_jobs.pop(job["session_id"], None)
    except Exception as exc:
        with jobs_lock:
            job["status"] = "failed"
            job["failed_items"].append({
                "message_id": job.get("current_message_id"),
                "error": str(exc)
            })
            job["finished_at"] = time.time()
            job["updated_at"] = time.time()
            active_unsend_jobs.pop(job["session_id"], None)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "Instagram DM Unsender API is running"
    }


@app.post("/api/session")
async def validate_session(request: SessionRequest):
    """Validate Instagram session ID"""
    try:
        client = InstagramClient(request.session_id)
        user = client.get_user_info()
        
        # Store session
        sessions[request.session_id] = client
        
        return {
            "success": True,
            "user": user
        }
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid session ID: {str(e)}"
        )


@app.get("/api/threads")
async def get_threads(x_session_id: str = Header(...)):
    """Get DM threads"""
    if x_session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    try:
        client = sessions[x_session_id]
        threads = client.get_threads()
        
        return {
            "success": True,
            "threads": threads
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch threads: {str(e)}"
        )


@app.get("/api/threads/{thread_id}/messages")
async def get_messages(
    thread_id: str,
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    x_session_id: str = Header(...)
):
    """Get messages from a thread"""
    if x_session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    try:
        client = sessions[x_session_id]
        result = client.get_thread_messages(thread_id, cursor=cursor, limit=limit)
        
        return {
            "success": True,
            "messages": result["messages"],
            "next_cursor": result["next_cursor"],
            "has_older": result["has_older"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch messages: {str(e)}"
        )


@app.post("/api/messages/unsend")
async def unsend_messages(
    request: UnsendRequest,
    x_session_id: str = Header(...)
):
    """Start an async unsend job"""
    if x_session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")

    if not request.message_ids:
        raise HTTPException(status_code=400, detail="No messages selected")
    
    try:
        client = sessions[x_session_id]
        with jobs_lock:
            active_job_id = active_unsend_jobs.get(x_session_id)
            if active_job_id:
                active_job = unsend_jobs.get(active_job_id)
                if active_job and active_job["status"] in {"queued", "running"}:
                    raise HTTPException(
                        status_code=409,
                        detail={
                            "message": "Another unsend job is already running",
                            "job": public_job(active_job)
                        }
                    )

            job_id = str(uuid4())
            now = time.time()
            job = {
                "job_id": job_id,
                "session_id": x_session_id,
                "thread_id": request.thread_id,
                "message_ids": list(request.message_ids),
                "client": client,
                "status": "queued",
                "total": len(request.message_ids),
                "processed": 0,
                "unsent": 0,
                "failed": 0,
                "failed_items": [],
                "current_message_id": None,
                "cancel_requested": False,
                "batch_size": 25,
                "created_at": now,
                "updated_at": now,
                "finished_at": None
            }
            unsend_jobs[job_id] = job
            active_unsend_jobs[x_session_id] = job_id

        thread = threading.Thread(target=run_unsend_job, args=(job_id,), daemon=True)
        thread.start()

        return {
            "success": True,
            "job": public_job(job)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start unsend job: {str(e)}"
        )


@app.get("/api/jobs/{job_id}")
async def get_unsend_job(
    job_id: str,
    x_session_id: str = Header(...)
):
    """Get unsend job progress"""
    with jobs_lock:
        job = unsend_jobs.get(job_id)
        if not job or job["session_id"] != x_session_id:
            raise HTTPException(status_code=404, detail="Job not found")
        return {
            "success": True,
            "job": public_job(job)
        }


@app.post("/api/jobs/{job_id}/cancel")
async def cancel_unsend_job(
    job_id: str,
    x_session_id: str = Header(...)
):
    """Request cancellation for a running unsend job"""
    with jobs_lock:
        job = unsend_jobs.get(job_id)
        if not job or job["session_id"] != x_session_id:
            raise HTTPException(status_code=404, detail="Job not found")

        if job["status"] in {"completed", "failed", "cancelled"}:
            return {
                "success": True,
                "job": public_job(job)
            }

        job["cancel_requested"] = True
        job["updated_at"] = time.time()
        return {
            "success": True,
            "job": public_job(job)
        }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
