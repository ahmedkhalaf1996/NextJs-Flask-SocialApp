from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class Post(BaseModel):
    title: str  
    message: str 
    creator: str 
    selectedFile: str 
    name: str 
    likes: Optional[List[str]] = Field(default=[])
    createdAt: datetime = Field(default_factory=datetime.utcnow)