from pydantic import BaseModel
from typing import List, Optional


class SessionRequest(BaseModel):
    session_id: str


class User(BaseModel):
    pk: int
    username: str
    full_name: str
    profile_pic_url: str


class Thread(BaseModel):
    thread_id: str
    thread_title: str
    users: List[User]
    last_message: str
    last_activity: str


class Message(BaseModel):
    id: str
    user_id: int
    text: str
    timestamp: str
    is_mine: bool


class UnsendRequest(BaseModel):
    thread_id: str
    message_ids: List[str]


class UnsendResponse(BaseModel):
    success: bool
    unsent: int
    failed: int