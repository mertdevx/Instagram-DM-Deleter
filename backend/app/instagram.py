from instagrapi import Client
from instagrapi.exceptions import ClientError
from typing import List, Dict, Optional
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
            result = []
            cursor = None
            seen_thread_ids = set()

            while True:
                params = {
                    "persistentBadging": "true",
                    "use_unified_inbox": "true",
                    "limit": "20"
                }

                if cursor:
                    params["cursor"] = cursor

                # Use private API method to get raw response
                response = self.client.private_request("direct_v2/inbox/", params=params)
                inbox = response.get("inbox", {})
                threads = inbox.get("threads", [])

                if not threads:
                    break

                for thread_data in threads:
                    # Extract thread info from raw JSON
                    thread_id = thread_data.get("thread_id", "")
                    if not thread_id or thread_id in seen_thread_ids:
                        continue

                    seen_thread_ids.add(thread_id)
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

                cursor = inbox.get("oldest_cursor")
                if not inbox.get("has_older") or not cursor:
                    break

                time.sleep(0.35)

            return result
        except Exception as e:
            print(f"Error fetching threads: {e}")
            return []
    
    def get_thread_messages(
        self,
        thread_id: str,
        cursor: Optional[str] = None,
        limit: int = 20
    ) -> Dict:
        """Get paginated messages from a thread using Instagram raw API"""
        params = {
            "visual_message_return_type": "unseen",
            "direction": "older",
            "seq_id": "0",
            "limit": str(limit)
        }

        if cursor:
            params["cursor"] = cursor

        response = self.client.private_request(
            f"direct_v2/threads/{thread_id}/",
            params=params
        )

        thread = response.get("thread", {})
        items = thread.get("items", [])
        users_by_pk = {
            str(user.get("pk")): user
            for user in thread.get("users", [])
        }

        # Ensure user_id is int for comparison
        my_user_id = int(self.user_id) if isinstance(self.user_id, str) else self.user_id

        result = []
        for item in items:
            msg_user_id = item.get("user_id")
            msg_user_id_int = int(msg_user_id) if msg_user_id is not None else 0
            user = users_by_pk.get(str(msg_user_id), {})
            item_id = str(item.get("item_id", ""))

            timestamp_ms = item.get("timestamp") or item.get("client_context") or 0
            try:
                timestamp = int(timestamp_ms) / 1000000
            except (TypeError, ValueError):
                timestamp = 0

            reactions = self._extract_my_reactions(item, my_user_id)

            result.append({
                "id": item_id,
                "user_id": msg_user_id_int,
                "user_name": user.get("username", "User"),
                "text": item.get("text") or "",
                "timestamp": timestamp,
                "is_mine": msg_user_id_int == my_user_id,
                "my_reactions": reactions,
                "has_my_reactions": len(reactions) > 0
            })

        return {
            "messages": result,
            "next_cursor": thread.get("oldest_cursor") or response.get("oldest_cursor"),
            "has_older": bool(thread.get("has_older") or response.get("has_older"))
        }

    def _extract_my_reactions(self, item: Dict, my_user_id: int) -> List[Dict]:
        """Extract reactions made by the current user from a raw DM item"""
        reactions = []
        reaction_data = item.get("reactions") or {}

        reaction_candidates = []
        if isinstance(reaction_data, dict):
            reaction_candidates.extend(reaction_data.get("emojis", []) or [])
            reaction_candidates.extend(reaction_data.get("likes", []) or [])
        elif isinstance(reaction_data, list):
            reaction_candidates.extend(reaction_data)

        for reaction in reaction_candidates:
            sender_id = reaction.get("sender_id") or reaction.get("user_id")
            try:
                sender_id_int = int(sender_id)
            except (TypeError, ValueError):
                continue

            if sender_id_int != my_user_id:
                continue

            emoji = reaction.get("emoji") or reaction.get("reaction") or "❤️"
            reactions.append({
                "emoji": emoji,
                "timestamp": reaction.get("timestamp"),
                "reaction_type": reaction.get("reaction_type") or "emoji"
            })

        return reactions
    
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
                if msg_id.startswith("reaction:"):
                    _, item_id, emoji = msg_id.split(":", 2)
                    self.delete_reaction(thread_id, item_id, emoji)
                else:
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

    def delete_reaction(self, thread_id: str, item_id: str, emoji: str) -> None:
        """Delete current user's emoji reaction from a DM item"""
        payload = {
            "item_id": item_id,
            "reaction_type": "emoji",
            "emoji": emoji
        }

        try:
            self.client.private_request(
                f"direct_v2/threads/{thread_id}/items/{item_id}/delete_reaction/",
                data=payload,
                with_signature=False
            )
        except Exception:
            self.client.private_request(
                "direct_v2/threads/broadcast/delete_reaction/",
                data={
                    "thread_id": thread_id,
                    **payload
                },
                with_signature=False
            )
