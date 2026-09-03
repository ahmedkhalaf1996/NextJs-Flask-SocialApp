from typing import List, Optional
from pydantic import BaseModel, Field

class User(BaseModel):
    name: str  
    email: str
    password: str
    bio: Optional[str] = Field(default="")
    imageUrl: Optional[str] = Field(default="")
    followers: Optional[List[str]] = Field(default=[])
    following: Optional[List[str]] = Field(default=[])

