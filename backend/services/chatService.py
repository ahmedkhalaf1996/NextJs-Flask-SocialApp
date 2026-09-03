import math 
import json 
from flask import Response 
import pymongo 

from models.unReadedmsg_model import UnReadedMsg 
from models.message_model import Message

# db connection & getSchema 
from DB.database import DataBase 
DB = DataBase.connect()
userSchema = DB.users 
messageSchema = DB.messages 
unReadedMsgSchema = DB.unreadedmsg 

# =================
class ChatService: 
    @staticmethod
    def sendMessage(msg):
        try:
            msg_in = Message(
                content=msg['content'],
                sender=msg['sender'],   
                recever=msg['recever'],
            )

            dbResponse = messageSchema.insert_one(dict(msg_in))
            if dbResponse.inserted_id:
                newMsg = messageSchema.find_one({"_id": dbResponse.inserted_id})

            # update unreadedmsg 
            sender = str(msg['sender'])
            recever = str(msg['recever']) 

            ChatService.update_unreaded_message(sender, recever)

            newMsg['_id'] = str(newMsg['_id'])
            if "createdAt" in newMsg:
                newMsg['createdAt'] = str(newMsg['createdAt'])
            # send res 
            return Response(
                response=json.dumps(newMsg),
                status=201,
                mimetype='application/json'
            )
        except:
            return None

    # helper func 
    @staticmethod
    def update_unreaded_message(sender, recever):
        try:
            existing_recored = unReadedMsgSchema.find_one_and_update(
                {"mainUserid": recever, "otherUserid": sender},
                {"$inc": {"numOfUnReadedMessages": 1}, "$set": {"isReaded": False}},
                upsert=True,
                return_document=pymongo.ReturnDocument.AFTER
            )

            if not existing_recored:
                new_record = UnReadedMsg(
                    mainUserid=recever,
                    otherUserid=sender,
                    numOfUnReadedMessages=1,
                    isReaded=False
                )
                unReadedMsgSchema.insert_one(dict(new_record))
            print(f"Updated unreaded message count for {recever} from {sender}")
        except Exception as e:
            print("Error in update_unreaded_message: ", e)

    # get message by number 
    @staticmethod
    def GetMsgByNums(from_val, firstuid, seconduid):
        try: 
            sender_filter = {"sender": firstuid, "recever": seconduid}
            receiver_filter = {"sender": seconduid, "recever": firstuid}

            messages = list(messageSchema.find({"$or": [sender_filter, receiver_filter]}).sort("_id", -1).skip(from_val * 8).limit(8))

            for ms in messages:
                ms['_id'] = str(ms['_id'])
                if "createdAt" in ms:
                    ms['createdAt'] = str(ms['createdAt'])
            message_list = list(messages)
            message_list.reverse()   

            return Response(
                response=json.dumps({"msgs": message_list}),
                status=200,
                mimetype='application/json'
            )

        except Exception as e:
            print("Error in GetMsgByNums: ", e)
            return  "Internal Server Error", 500  

    # get user un reaed messages 
    @staticmethod
    def GetUserUnReadedMsg(userid):
        try:
            unReadedMsgs = list(unReadedMsgSchema.find({"mainUserid": userid, "isReaded": False}))

            total_unreaded_message_count = sum(msg['numOfUnReadedMessages'] for msg in unReadedMsgs)

            for msg in unReadedMsgs:
                msg['_id'] = str(msg['_id'])
            return Response(
                response=json.dumps({"messages": unReadedMsgs, "total": total_unreaded_message_count}),
                status=200,
                mimetype='application/json'
            )
        except Exception as e:
            print("Error in GetUserUnReadedMsg: ", e)
            return None 
    # mark msg as readed 
    @staticmethod
    def MarkMsgAsReaded(mainuid, otheruid):
        try: 
            filter = {"mainUserid": mainuid, "otherUserid": otheruid}
            update = {"$set": {"isReaded": True, "numOfUnReadedMessages": 0}}

            result = unReadedMsgSchema.find_one_and_update(filter, update, upsert=True, return_document=pymongo.ReturnDocument.AFTER)

            if result:
                return Response(
                    response=json.dumps({"isMarked": True}),
                    status=200,
                    mimetype='application/json'
                )
            else:
                return Response(
                    response=json.dumps({"isMarked": False}),
                    status=404,
                    mimetype='application/json'
                )
        except Exception as e:
            print("Error in MarkMsgAsReaded: ", e)
            return None