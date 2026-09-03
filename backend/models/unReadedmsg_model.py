from pydantic import BaseModel

class UnReadedMsg(BaseModel):
    mainUserid: str 
    otherUserid: str
    numOfUnReadedMessages: int 
    isReaded: bool  
