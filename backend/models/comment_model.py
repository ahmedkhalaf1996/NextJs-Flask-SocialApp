from typing import  Optional
from pydantic import BaseModel, Field
from datetime import datetime

class Comment(BaseModel):
    postId: str 
    creator: str 
    value: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)