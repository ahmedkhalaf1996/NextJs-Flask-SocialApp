import json 
from typing import Optional
from bson import ObjectId
from flask import Response
import math
from services.postService import notify_user_helper
from models.users_model import User 
from models.notification_model import Notification
from services.postService import PostService
from passlib.context import CryptContext
from auth.auth_handler import signJWT 
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# db Conncection & getSchema 
from DB.database import DataBase

DB = DataBase.connect()
userSchema = DB.users 
postSchema = DB.posts
notificationSchema = DB.notifications
# ===============
class UserService:
# user auth start 
    # Resgister user 
    @staticmethod
    def createUser(user):
        user_in = User(
            name= str(user['firstName'] + " " + user['lastName']),
            email= str(user['email']),
            password= password_context.hash(user['password']),
        )

        dbResponse = userSchema.insert_one(dict(user_in))

        if dbResponse.inserted_id:
            result = userSchema.find_one({"_id": dbResponse.inserted_id})
            result['_id'] = str(result['_id'])
            del result['password'] 
            token = signJWT(result['_id'])

            return Response(
                response=json.dumps(
                    { "result": result, "token": token['access_token'] }
                ),
                status=201,
                mimetype="application/json"
            )
    # login user 
    @staticmethod
    def authenticate(userBody):
        user = UserService.get_user_by_email(email=userBody['email'])
        if not user:
            return None
        if not password_context.verify(userBody['password'], user['password']):
            return None

        token = signJWT(str(user['_id']))
        user['_id'] = str(user['_id'])
        del user['password']
        return Response(
            response=json.dumps(
                { "result": user, "token": token['access_token'] }
            ),
            status=200,
            mimetype="application/json"
        )

    # getuserbyemdil 
    @staticmethod
    def get_user_by_email(email: str) -> Optional[User]:
        user = userSchema.find_one({"email": email})
        return user


    # get user by id 
    @staticmethod
    def getUserByid(userid: str , withPosts: bool = True, page: int =1):
        try:
         user = userSchema.find_one({"_id": ObjectId(userid)})
         if not user: 
            return None 
         user['_id'] = str(user['_id'])
         user.pop('password', None) 

         if not withPosts:
            return {"user": user}

         Limit = 2
         startIndex = (int(page) -1) * Limit

         total = postSchema.count_documents({"creator": userid})

         pipeline = PostService._aggreate_post_pipeline({"creator": userid})
         pipeline.extend([
            {"$sort": {"_id": -1}},
            {"$skip": startIndex},
            {"$limit": Limit}
         ])

         posts = list(postSchema.aggregate(pipeline))
         if posts:  
            for post in posts:
                post["_id"] = str(post["_id"])
                post["createdAt"] = str(post["createdAt"])  
                for c in post.get("comments", []):
                    c["_id"] = str(c["_id"])
                    if "createdAt" in c:
                     c["createdAt"] = str(c["createdAt"]) 

         return {
                "user": user,
                "posts": posts,
                "currentPage": page,
                "numberOfPages": math.ceil(float(total) / float(Limit))
        }
        
        except Exception as e:
            print(f"Error in getUserByid: {e}")
            return None

    # update user 
    @staticmethod
    def UpdateUser(body, id: str):
        try:
            userbody = {"name": body['name'], "bio": body['bio'], "imageUrl": body['imageUrl']}
            dbResponse = userSchema.update_one({"_id": ObjectId(id)}, {"$set": userbody})
            
            if dbResponse: 
                user = userSchema.find_one({"_id": ObjectId(id)})
                user['_id'] = str(user['_id'])
                user.pop('password', None) 


                pipeline = PostService._aggreate_post_pipeline({"creator": id})
                pipeline.extend([
                    {"$sort": {"_id": -1}}
                ])

                posts = list(postSchema.aggregate(pipeline))
                if posts:  
                    for post in posts:
                        post["_id"] = str(post["_id"])
                        post["createdAt"] = str(post["createdAt"])  
                        for c in post.get("comments", []):
                            c["_id"] = str(c["_id"])
                            if "createdAt" in c:
                             c["createdAt"] = str(c["createdAt"]) 

            else: 
                posts = []

            return Response(
                response=json.dumps(
                    { "user": user, "posts": posts }
                ),
                status=200,
                mimetype="application/json"
            )
        except Exception as e:
            print('error', e)
            return None  

    # follow user & un follow 
    @staticmethod 
    def FollowingUser(id: str, NextUserID: str):
        try: 
            user1 = userSchema.find_one({"_id": ObjectId(id)})
            user2 = userSchema.find_one({"_id": ObjectId(NextUserID)}) 
            # check if is nextuser already in main userfollowers list 
            if str(NextUserID) in user1['followers']:
                user1['followers'].remove(str(NextUserID))
                user2['following'].remove(str(id))
            else:
                user1['followers'].append(str(NextUserID))
                user2['following'].append(str(id))

            userSchema.update_one({"_id": ObjectId(id)}, {"$set": {"followers": user1['followers'], "following": user1['following']}})
            userSchema.update_one({"_id": ObjectId(NextUserID)}, {"$set": {"followers": user2['followers'], "following": user2['following']}})

            user1["_id"] = str(user1["_id"])
            user2["_id"] = str(user2["_id"])
            user1.pop('password', None)
            user2.pop('password', None)

            usernotfy = userSchema.find_one({"_id": ObjectId(user2["_id"])}) 
            notify_id = Notification(
                deatils=f"{usernotfy['name']} start following you.",
                mainuid=user1["_id"],
                targetid=user2["_id"],
                userid=user2["_id"]
            )

            # save Notification
            inserted_id = notificationSchema.insert_one(notify_id.dict()).inserted_id
            notifyed = notificationSchema.find_one({"_id": ObjectId(inserted_id)})
            notifyed["_id"] = str(notifyed["_id"])
            notifyed["createdAt"] = str(notifyed["createdAt"])

            #  emit notification locally to socket 
            notify_user_helper(user1["_id"], notifyed)

            return Response(
                response=json.dumps(
                    {"updateduser1": user1, "updateduser2": user2}
                ),
                status=200,
                mimetype="application/json"
            )
        except Exception as ex:
            return Response(
                response=json.dumps(
                    {"message": "cannot follow user", "error": f"{ex}"}
                ),
                status=500,
                mimetype="application/json"
            )


# get some suggested users for our user 
    @staticmethod
    def GetSugUsers(id: str):
        try: 
            MainUser = userSchema.find_one({"_id": ObjectId(id)})
            if not MainUser:
                return {"users": []}
            suggestion_by_id = {}
            excluded_ids = set([str(MainUser["_id"])] + MainUser.get('following', []))

            for FoIdes in MainUser.get('following', []):
                fuser = userSchema.find_one({"_id": ObjectId(FoIdes)})
                if not fuser:
                    continue

                for i in fuser.get('followers', []):
                    if str(i) not in excluded_ids:
                        lastf = userSchema.find_one({"_id": ObjectId(i)})
                        if lastf:
                            suggestion_by_id[str(lastf["_id"])] = lastf
                

                for i in fuser.get('following', []):
                    if str(i) not in excluded_ids:
                        lastg = userSchema.find_one({"_id": ObjectId(i)})
                        if lastg:
                            suggestion_by_id[str(lastg["_id"])] = lastg
                
            AllSugUsers = list(suggestion_by_id.values())
            for user in AllSugUsers:
                user["_id"] = str(user["_id"])
                user.pop("password", None)
            return {"users": AllSugUsers}
        except:
            return None