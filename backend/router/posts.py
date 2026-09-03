import json 
from flask import Blueprint, request, Response
from flask_restx import Namespace , Resource

from auth.auth_bearer import token_required
from services.postService import PostService 
from auth.auth_handler import decodeJWT

from interfaces.post_interfaces import post_create, post_update, post_q_search, post_q_get, post_ns

post_router = Blueprint('posts', __name__)

@post_ns.route("")
class PostList(Resource):
    @post_ns.expect(post_create, validate=True)
    @token_required
    @post_ns.doc(security='BearerAuth')
    def post(self):
        try:
            PData = request.get_json()
            ID = decodeJWT(request.headers["authorization"].split()[1])["user_id"]
            PData['creator'] = ID 
            return PostService.createPost(PData)
        except Exception as e:
            print(f"error{e}")
            return Response (
                response=json.dumps({"message": "something went wrong"}),
                status=500,
                mimetype="application/json"
            )
    @post_ns.expect(post_q_get)
    def get(self):
        try: 
            page = request.args.get("page")
            id = request.args.get("id")
            return PostService.GetAllPosts(page, id)
        except:
            return Response (
                response=json.dumps({"message": "No Posts"}),
                status=404,
                mimetype="application/json"
            )         

@post_ns.route("/<id>")
class Post(Resource):
    def get(self, id):
        post = PostService.GetPostById(id)
        if not post:
           return Response (
                response=json.dumps({"message": "post not found"}),
                status=404,
                mimetype="application/json"
            )   
        return post 
    @token_required
    @post_ns.doc(security='BearerAuth')
    @post_ns.expect(post_update, validate=True)
    def patch(self, id):
        try:
            # check auth 
            post = PostService.GetPostById(id)

            token_user_id = decodeJWT(request.headers['authorization'].split()[1])["user_id"]
            if str(token_user_id) != str(post['post']['creator']):
             return Response(
                response=json.dumps({"error": "You are not authorized  to update   this post."}),
                status=403,
                mimetype="application/json"
             ) 
            
            body = request.get_json()
            return PostService.UpdatePost(id, body)
        except:
            return Response (
                response=json.dumps({"message": "Can't Update Post"}),
                status=400,
                mimetype="application/json"
            )
    @token_required
    @post_ns.doc(security='BearerAuth')
    def delete(self, id):
        try: 
            # check auth 
            post = PostService.GetPostById(id)

            token_user_id = decodeJWT(request.headers['authorization'].split()[1])["user_id"]
            if str(token_user_id) != str(post['post']['creator']):
             return Response(
                response=json.dumps({"error": "You are not authorized  delete  this post."}),
                status=403,
                mimetype="application/json"
             ) 
            return PostService.DeletePost(id)
        except: 
            return Response (
                response=json.dumps({"message": "Can't Update Post"}),
                status=400,
                mimetype="application/json"
            )


@post_ns.route("/search")
class PostSearch(Resource):
    @post_ns.expect(post_q_search)
    def get(self):
        try:
            search = request.args.get("searchQuery")
            page = request.args.get("page", 1)
            current_user_id = request.args.get("id")
            return PostService.GetPostUserBySearch(search, page, current_user_id)
        except Exception as e:
            print(f"error{e}")
            return Response (
                response=json.dumps({"Error": "No User Or Posts Result"}),
                status=400,
                mimetype="application/json"
            )

@post_ns.route("/<id>/likePost")
class PostLike(Resource):
    @token_required
    @post_ns.doc(security='BearerAuth')
    def patch(self, id):
        try:
            userID = decodeJWT(request.headers['authorization'].split()[1])["user_id"]
            return PostService.LikePost(id, userID)
        except Exception as e:
            print(f"error{e}")
            return Response (
                response=json.dumps({"message": "can't Like The Post"}),
                status=400,
                mimetype="application/json"
            )