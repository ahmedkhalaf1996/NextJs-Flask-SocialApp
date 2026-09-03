import math 
import json 
import re 
from bson import ObjectId
from flask import Response 
import pymongo 
from datetime import datetime 

from models.posts_model import Post 
from models.notification_model import Notification

from DB.database import DataBase 
DB = DataBase.connect()
userSchema = DB.users 
postSchema = DB.posts 
notificationSchema = DB.notifications 
commentSchema = DB.comments 

def notify_user_helper(user_id, notification_dict):
    try:
       from extensions import socketio, user_connections
       sid = user_connections.get(user_id)
       if sid:
           socketio.emit('receiveNotification', notification_dict, room=sid)
    except Exception as e:
        print("Emit error", e)


class PostService:
    @staticmethod
    def _aggreate_post_pipeline(match_condition):
        return [
            {"$match": match_condition},
            {
                "$lookup": {
                    "from": "users",
                    "let": {"creator_id": {"$toObjectId": "$creator"}},
                    "pipeline": [
                        {"$match": {"$expr": {"$eq": ["$_id", "$$creator_id"]}}}
                    ],
                    "as": "creator_info"
                }
            },
            {"$unwind": {"path": "$creator_info", "preserveNullAndEmptyArrays": True}},
            # lookup comments for this post
            {
                "$lookup": {
                    "from": "comments",
                    "let": {"post_id_str": {"$toString": "$_id"}},
                    "pipeline": [
                        {"$match": {"$expr": {"$eq": ["$postId", "$$post_id_str"]}}},
                        # lookup the user that made the comment 
                       {
                        "$lookup": {
                            "from": "users",
                            "let": {"comment_creator_id": {"$toObjectId": "$creator"}},
                            "pipeline": [
                                {"$match": {"$expr": {"$eq": ["$_id", "$$comment_creator_id"]}}}
                            ],
                            "as": "comment_user"
                          }
                        },
                        {"$unwind": {"path": "$comment_user", "preserveNullAndEmptyArrays": True}},
                        {
                            "$addFields": {
                                "creator_name":"$comment_user.name",
                                "creator_avatar": "$comment_user.imageUrl"
                            }
                        },
                        {"$project": {"comment_user": 0}}

                    ],
                    "as": "comments_data"
                }
            },
            # add up to data name to post 
             {
                "$addFields": {
                    "name":{"$ifNull": ["$creator_info.name",  "$name"]},
                    "comments": "$comments_data"
                }
            },
            {"$project": {"creator_info": 0, "comments_data": 0}}
        ]

    # create post 
    @staticmethod
    def createPost(post):
        user = userSchema.find_one({"_id": ObjectId(post['creator'])})
        if not user:
            return None 
        post['name'] = str(user['name'])

        try:
            post_in = Post(
                title=str(post['title']),
                message=str(post['message']),
                creator=str(post['creator']),
                selectedFile=str(post['selectedFile']),
                name=str(post['name']),
                likes=[],
            )
            dbResponse = postSchema.insert_one(dict(post_in))
            if dbResponse.inserted_id:
                result = list(postSchema.aggregate(PostService._aggreate_post_pipeline({"_id": dbResponse.inserted_id})))
                if result:
                    result = result[0]
                    result["_id"] = str(result["_id"])
                    result["createdAt"] = str(result["createdAt"])

                    for c in result.get("comments", []):
                        c["_id"] = str(c["_id"])
                        c["createdAt"] = str(c["createdAt"])
                    return Response(
                        response=json.dumps(
                            {"result": result}    
                        ),
                        status=201,
                        mimetype="application/json"
                    )
        except Exception as e:
            print('create post error', e)
            return None


    # add commnet o the post 
    @staticmethod
    def CommentPostMethod(body, id:str, useridCom: str):
        try:
            post = postSchema.find_one({"_id": ObjectId(id)})
            if not post:
                return Response(response=json.dumps({"error": "Post not found"}), status=404, mimetype="application/json")

            new_commnet = {
                "postId": id,
                "creator": useridCom,
                "value": str(body['value']),
                "createdAt": datetime.utcnow()
            }

            commentSchema.insert_one(new_commnet)

            # start creating notification 
            user = userSchema.find_one({"_id": ObjectId(useridCom)})
            notify_in = Notification(
                deatils=f"{user['name']} commented on your Post",
                mainuid=post['creator'],
                targetid=id,
                userid=useridCom
            )

            inserted_id = notificationSchema.insert_one(notify_in.dict()).inserted_id
            notifyed = notificationSchema.find_one({"_id": ObjectId(inserted_id)})
            notifyed["_id"] = str(notifyed["_id"])
            notifyed["createdAt"] = str(notifyed["createdAt"])

            # local emit notify socket 
            notify_user_helper(post['creator'], notifyed)

            updated_post_arr = list(postSchema.aggregate(PostService._aggreate_post_pipeline({"_id": ObjectId(id)})))
            if updated_post_arr:
                post_data = updated_post_arr[0]
                post_data["_id"] = str(post_data["_id"])
                post_data["createdAt"] = str(post_data["createdAt"])

                for c in post_data.get("comments", []):
                    c["_id"] = str(c["_id"])
                    c["createdAt"] = str(c["createdAt"])  
                return Response(
                        response=json.dumps(
                            {"data": post_data}    
                        ),
                        status=201,
                        mimetype="application/json"
                    )
        except Exception as e:
            print(e)
            return Response(
                response=json.dumps(
                    {"error": "faild comment on post"}    
                ),
                status=500,
                mimetype="application/json"
            )

    # get posts and users by search 
    @staticmethod
    def GetPostUserBySearch(searchQuery:str, pageStr=1, current_user_id=None):
        try:
            page = int(pageStr) if pageStr else 1 
            limit = 5 
            startIndex = (page -1) * limit 
            regex =  re.compile(re.escape(searchQuery), re.IGNORECASE)
            match_cond = {"$or": [{"title": {"$regex": regex}}, {"message": {"$regex": regex}}]}

            user_match = {"name": {"$regex":  regex}} 
            if current_user_id:
                user_match["_id"] = {"$ne": ObjectId(current_user_id)}      

            total_posts = postSchema.count_documents(match_cond)
            total_users = userSchema.count_documents(user_match)

            pipeline = PostService._aggreate_post_pipeline(match_cond)
            pipeline.extend([
                {"$sort": {"_id": -1}},
                {"$skip": startIndex},
                {"$limit": limit}
            ])

            posts = list(postSchema.aggregate(pipeline))
            users = list(userSchema.find(user_match).sort("_id", -1).skip(startIndex).limit(limit))

            for post in posts:
                post["_id"] = str(post["_id"])
                post["createdAt"] = str(post["createdAt"])  
                for c in post.get("comments", []):
                    c["_id"] = str(c["_id"])
                    c["createdAt"] = str(c["createdAt"])  

            for user in users:
                user["_id"] = str(user["_id"])
                user.pop("password", None)

            number_of_pages = max(
                math.ceil(float(total_posts) / float(limit)) if limit else 0,
                math.ceil(float(total_users) / float(limit)) if limit else 0
            )  

            return Response(
                response=json.dumps({
                    "posts": posts,
                    "users": users,
                    "currentPage": page,
                    "numberOfPages": number_of_pages
                }),
                status=200,
                mimetype="application/json"
            )
        except Exception as e:
            print(e)
            return None

    # getPostById 
    @staticmethod
    def GetPostById(id:str):
        try:
            post_arr = list(postSchema.aggregate(PostService._aggreate_post_pipeline({"_id": ObjectId(id)})))
            if post_arr:
                post = post_arr[0]
                post["_id"] = str(post["_id"])
                post["createdAt"] = str(post["createdAt"])  
                for c in post.get("comments", []):
                    c["_id"] = str(c["_id"])
                    c["createdAt"] = str(c["createdAt"]) 
                return {"post": post}
            return None
        except:
            return None 

    # GetAllPosts Related to the User && Paganation
    @staticmethod
    def GetAllPosts(pageStr: str, id: str):
        try:
            page = int(pageStr) if pageStr else 1
            Limit = 2
            startIndex = (int(page) -1) * Limit

            MainUser = userSchema.find_one({"_id": ObjectId(id)})
            following_list = MainUser.get('following', [])
            following_list.append(str(MainUser['_id']))

            MainStr = [{"creator": str(uid)} for uid in following_list]
            total = postSchema.count_documents({"$or": MainStr})

            pipeline = PostService._aggreate_post_pipeline({"$or": MainStr})
            pipeline.extend([
                {"$sort": {"_id": -1}},
                {"$skip": startIndex},
                {"$limit": Limit}
            ])

            Posts = list(postSchema.aggregate(pipeline))

            for post in Posts:
                post["_id"] = str(post["_id"])
                post["createdAt"] = str(post["createdAt"])  
                for c in post.get("comments", []):
                    c["_id"] = str(c["_id"])
                    c["createdAt"] = str(c["createdAt"]) 

            return {
                    "data": Posts,
                    "currentPage": page,
                    "numberOfPages": math.ceil(float(total) / float(Limit))
            }

        except Exception as e:
            print("GetAllPosts error: ", e)
            return None

    # Update Post 
    @staticmethod
    def UpdatePost(id:str, newPost):
        try:
            updatedpost = {"title": newPost['title'], "message": newPost["message"],"selectedFile": newPost["selectedFile"] }
            postSchema.update_one({"_id": ObjectId(id)}, {"$set": updatedpost})

            post_arr = list(postSchema.aggregate(PostService._aggreate_post_pipeline({"_id": ObjectId(id)})))
            if post_arr:
                updated = post_arr[0]
                updated["_id"] = str(updated["_id"])
                updated["createdAt"] = str(updated["createdAt"])  
                for c in updated.get("comments", []):
                    c["_id"] = str(c["_id"])
                    c["createdAt"] = str(c["createdAt"]) 
                return {"data": updated}
            return None
        except:
            return None
    # likePost
    @staticmethod
    def LikePost(id:str, UserId: str):
        try:
            post = postSchema.find_one({"_id": ObjectId(id)})

            if UserId in post.get('likes', []):
                post['likes'].remove(UserId)
            else:
                post['likes'].append(UserId)
                # start creating Notification 
                user = userSchema.find_one({"_id": ObjectId(UserId)})
                notify_in = Notification(
                    deatils=f"{user['name']} liked your Post",
                    mainuid=post['creator'],
                    targetid=id,
                    userid=UserId
                )

                # save notification 
                inserted_id = notificationSchema.insert_one(notify_in.dict()).inserted_id
                notifyed = notificationSchema.find_one({"_id": ObjectId(inserted_id)})
                notifyed["_id"] = str(notifyed["_id"])
                notifyed["createdAt"] = str(notifyed["createdAt"])

                # local emit notify socket 
                notify_user_helper(post['creator'], notifyed)

            postSchema.update_one({"_id": ObjectId(id)}, {"$set": {"likes": post['likes']}})

            post_arr = list(postSchema.aggregate(PostService._aggreate_post_pipeline({"_id": ObjectId(id)})))

            if post_arr:
                updated = post_arr[0]
                updated["_id"] = str(updated["_id"])
                updated["createdAt"] = str(updated["createdAt"])  
                for c in updated.get("comments", []):
                    c["_id"] = str(c["_id"])
                    c["createdAt"] = str(c["createdAt"]) 
                return {"post": updated}   
            return None
        except Exception as e:
            print("Like error", e)
            return None

    # delete post 
    @staticmethod
    def DeletePost(id: str):
        try:
            post = postSchema.delete_one({"_id": ObjectId(id)})
            # delete associated comments 
            commentSchema.delete_many({"postId": id})
        except:
            return None

# commnet Area $$$$$$$$$$$$$$$
    @staticmethod
    def GetCommentById(id:str):
        try:
            return commentSchema.find_one({"_id": ObjectId(id)})
        except:
            return None 

    @staticmethod
    def DeleteComment(comment_id: str):
        try:
            result = commentSchema.delete_one({"_id": ObjectId(comment_id)})
            if result.deleted_count > 0:
                return Response(
                response=json.dumps({
                    "message": "Comment Deleted Scessflly.",
                }),
                status=200,
                mimetype="application/json"
              )   
            return Response(
                response=json.dumps({
                    "error": "comment not found",
                }),
                status=200,
                mimetype="application/json"
              )   
        except Exception as e:
            print("Delete Comment Error", e)
            return Response(
                response=json.dumps({
                    "error": "Faild to delete commnet",
                }),
                status=500,
                mimetype="application/json"
            )