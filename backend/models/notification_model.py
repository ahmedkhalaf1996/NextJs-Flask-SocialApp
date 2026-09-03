from pydantic import BaseModel, Field
from datetime import datetime

class Notification(BaseModel):
    deatils: str
    mainuid: str
    targetid: str
    userid: str 
    isreded: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)