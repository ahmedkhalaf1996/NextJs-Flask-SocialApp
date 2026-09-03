import json 
from flask import request, Response
from flask_restx import Namespace, Resource, fields
from services.postService import PostService
from auth.auth_bearer import token_required
from auth.auth_handler import decodeJWT
from interfaces.post_interfaces import comment_create

comment_ns = Namespace('comment', description='Comment related operations')

@comment_ns.route('/<string:id>')
class CommentRoute(Resource):
    @comment_ns.expect(comment_create, validate=True)
    @token_required
    @comment_ns.doc(security='BearerAuth')
    def post(self, id ):
        "Add a commnet to a post"
        try:
            data = request.get_json()
            useridCom = decodeJWT(request.headers["authorization"].split()[1])["user_id"]
            return PostService.CommentPostMethod(data, id, useridCom)
        except Exception as e:
            print(f"error{e}")
            return Response (
                response=json.dumps({"message": "Unable to Add Your Comment!"}),
                status=500,
                mimetype="application/json"
            )
    @comment_ns.doc(security='BearerAuth')
    @token_required
    def delete(self, id):
        try: 
            # check auth 
            commnet = PostService.GetCommentById(id)

            token_user_id = decodeJWT(request.headers['authorization'].split()[1])["user_id"]
            if str(token_user_id) != str(commnet['creator']):
             return Response(
                response=json.dumps({"error": "You are not authorized  delete  this comment."}),
                status=403,
                mimetype="application/json"
             ) 
            return PostService.DeleteComment(id)
        except: 
            return Response (
                response=json.dumps({"message": "Can't Update Post"}),
                status=400,
                mimetype="application/json"
            )







