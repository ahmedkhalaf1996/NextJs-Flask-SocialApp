from datetime import datetime
from pydantic import BaseModel, Field

class Message(BaseModel): 
    content: str 
    sender: str 
    recever: str 
    createdAt: datetime = Field(default_factory=datetime.utcnow)