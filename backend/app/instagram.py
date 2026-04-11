from instagrapi import Client
from instagrapi.exceptions import ClientError
from typing import List, Dict
import time
import json


class InstagramClient:
    def __init__(self, session_id: str):
        self.client = Client()
        self.client.set_settings({
            "sessionid": session_id
        })
        self.client.login_by_sessionid(session_id)
        self.user_id = self.client.user_id
    
    def get_user_info(self) -> Dict:
        """Get current user info"""
        user = self.client.user_info(self.user_id)
        return {
            "pk": user.pk,
            "username": user.username,
            "full_name": user.full_name,
            "profile_pic_url": str(user.profile_pic_url)
        }
    
    def get_threads(self) -> List[Dict]:
        """Get DM threads - using raw API to avoid Pydantic validation issues"""
        try:
            # Use private API method to get raw response
            response = self.client.private_request("direct_v2/inbox/", params={"persistentBadging": "true", "use_unified_inbox": "true"})
            
            result = []
            if "inbox" in response and "threads" in response["inbox"]:
                for thread_data in response["inbox"]["threads"]:
                    # Extract thread info from raw JSON
                    thread_id = thread_data.get("thread_id", "")
                    thread_title = thread_data.get("thread_title", "Unknown")
                    
                    # Get users
                    users = []
                    for user_data in thread_data.get("users", []):
                        users.append({
                            "pk": user_data.get("pk", 0),
                            "username": user_data.get("username", ""),
                            "full_name": user_data.get("full_name", user_data.get("username", "")),
                            "profile_pic_url": user_data.get("profile_pic_url", "")
                        })
                    
                    # Get last message
                    last_message = ""
                    items = thread_data.get("items", [])
                    if items and len(items) > 0:
                        last_item = items[0]
                        if "text" in last_item:
                            last_message = last_item["text"]
                    
                    # If no thread title, create from usernames
                    if not thread_title or thread_title == "Unknown":
                        if users:
                            thread_title = ", ".join([u["username"] for u in users[:3]])
                    
                    result.append({
                        "thread_id": thread_id,
                        "thread_title": thread_title,
                        "users": users,
                        "last_message": last_message,
                        "last_activity": thread_data.get("last_activity_at", "")
                    })
            
            return result
        except Exception as e:
            print(f"Error fetching threads: {e}")
            return []
    
    def get_thread_messages(self, thread_id: str) -> List[Dict]:
        """Get messages from a thread"""
        messages = self.client.direct_messages(thread_id)
        
        # Ensure user_id is int for comparison
        my_user_id = int(self.user_id) if isinstance(self.user_id, str) else self.user_id
        
        result = []
        for msg in messages:
            msg_user_id = int(msg.user_id) if isinstance(msg.user_id, str) else msg.user_id
            
            result.append({
                "id": str(msg.id),
                "user_id": msg_user_id,
                "text": msg.text or "",
                "timestamp": msg.timestamp.isoformat(),
                "is_mine": msg_user_id == my_user_id
            })
        
        return result
    
    def unsend_messages(
        self,
        thread_id: str,
        message_ids: List[str]
    ) -> Dict:
        """Unsend messages"""
        unsent = 0
        failed = 0
        
        for msg_id in message_ids:
            try:
                self.client.direct_message_delete(thread_id, msg_id)
                unsent += 1
                time.sleep(1)  # Rate limiting
            except Exception as e:
                print(f"Failed to unsend {msg_id}: {e}")
                failed += 1
        
        return {
            "unsent": unsent,
            "failed": failed
        }