from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
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
    x_session_id: str = Header(...)
):
    """Get messages from a thread"""
    if x_session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    try:
        client = sessions[x_session_id]
        messages = client.get_thread_messages(thread_id)
        
        return {
            "success": True,
            "messages": messages
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
    """Unsend messages"""
    if x_session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    try:
        client = sessions[x_session_id]
        result = client.unsend_messages(
            request.thread_id,
            request.message_ids
        )
        
        return {
            "success": True,
            "unsent": result["unsent"],
            "failed": result["failed"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to unsend messages: {str(e)}"
        )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)