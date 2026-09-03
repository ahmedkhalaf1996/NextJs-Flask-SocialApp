import math 
import json 
from typing import Optional
from bson import ObjectId
from flask import Response 
import pymongo 



from DB.database import DataBase 
DB = DataBase.connect()
userSchema = DB.users 
notificationSchema = DB.notifications 


class NotificationService:
    @staticmethod
    def getuserNotificaion(userid):
        try:
           pipeline = [
               {"$match": {"mainuid": {"$regex": userid, "$options": 'i'}}},
               {"$sort": {"_id": -1}},
                { "$lookup": {
                    "from": "users",
                    "let": {"trigger_id": {"$toObjectId": "$userid"}},
                    "pipeline": [
                        {"$match": {"$expr": {"$eq": ["$_id", "$$trigger_id"]}}}
                    ],
                    "as": "user_info"
                }
            },
            {"$unwind": {"path": "$user_info", "preserveNullAndEmptyArrays": True}},
            {
                "$addFields":{
                    "user":{
                        "name": "$user_info.name",
                        "avatar": "$user_info.imageUrl"
                    }
                }
            },
            {"$project": {"user_info": 0}}
           ]

           notifications = list(notificationSchema.aggregate(pipeline))
           for notification in notifications:
               notification["_id"] = str(notification["_id"])
               notification["createdAt"] = str(notification["createdAt"])
               
           return Response(
                response=json.dumps({"notifications": notifications}),
                status=200,
                mimetype="application/json"
            )


        except Exception as e:
            print('Error get user notifications:', e)
            return Response(
                response=json.dumps({"notifications": []}),
                status=500,
                mimetype="application/json"
            )


    @staticmethod
    def MarknotAsReaded(id):
        try:
           filter = {"mainuid": id}
           update = {"$set": {"isreded": True}}

           result = notificationSchema.update_many(filter, update)
           print(f"modified cound:{result.modified_count}")
           pipeline = [
               {"$match": filter},
               {"$sort": {"_id": -1}},
                { "$lookup": {
                    "from": "users",
                    "let": {"trigger_id": {"$toObjectId": "$userid"}},
                    "pipeline": [
                        {"$match": {"$expr": {"$eq": ["$_id", "$$trigger_id"]}}}
                    ],
                    "as": "user_info"
                }
            },
            {"$unwind": {"path": "$user_info", "preserveNullAndEmptyArrays": True}},
            {
                "$addFields":{
                    "user":{
                        "name": "$user_info.name",
                        "avatar": "$user_info.imageUrl"
                    }
                }
            },
            {"$project": {"user_info": 0}}
           ]

           notifications = list(notificationSchema.aggregate(pipeline))
           for notification in notifications:
               notification["_id"] = str(notification["_id"])
               notification["createdAt"] = str(notification["createdAt"])
               
           return Response(
                response=json.dumps({"notifications": notifications}),
                status=200,
                mimetype="application/json"
            )

        except Exception as e:
            print('Error marking  notifications as red:', e)
            return Response(
                response=json.dumps({"notifications": []}),
                status=500,
                mimetype="application/json"
            )




