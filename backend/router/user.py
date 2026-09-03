import json
from flask import Blueprint, request, Response
from flask_restx import  Resource, Namespace

from auth.auth_bearer import token_required
from services.userService import UserService
from auth.auth_handler import decodeJWT

from interfaces.user_interfaces import user_ns, user_signup, user_signin, user_update, query_parser_id, user_get_parser

UserRouter = Blueprint('user', __name__,)

# endpoints 
@user_ns.route('/signup')
class UserSignup(Resource):
    @user_ns.expect(user_signup, validate=True)
    def post(self):
        user = request.get_json()
        try: 
            return UserService.createUser(user)
        except Exception as e:
            return Response(
                response=json.dumps(
                    { 
                    "message": "Cannot create User",
                    "error": f"{e}"}
                    ),
                status=500,
                mimetype="application/json"
            )


@user_ns.route('/signin')
class UserSignIn(Resource):
    @user_ns.expect(user_signin, validate=True)
    def post(self):
        user  = request.get_json()

        try: 
            response =  UserService.authenticate(user)
            if response:
                return response 
            else:
                return Response(
                    response=json.dumps(
                        { 
                        "error": "Email Or Password is Not Correct"}
                        ),
                    status=401,
                    mimetype="application/json"
                )                
        except Exception as e:
            return Response(
                response=json.dumps(
                    { 
                    "message": "Cannot login  User",
                    "error": f"{e}"}
                    ),
                status=500,
                mimetype="application/json"
            )

@user_ns.route('/getUser')
class UserGet(Resource):
    @user_ns.expect(user_get_parser)
    def get(self):
        userid = request.args.get('userid')
        if not userid:
            return Response(
                response=json.dumps({"error": "userid query  parameter is required"}),
                status=400,
                mimetype="application/json"
            )

        with_posts_str = request.args.get('withPosts', 'true')
        with_posts = with_posts_str.lower() in ['true', '1', 'yes']

        try:
            page = int(request.args.get('page',1))
        except ValueError: 
            page = 1
        data = UserService.getUserByid(userid, with_posts, page)
        if not data: 
            return Response(
                response=json.dumps({"error": "user not found"}),
                status=404,
                mimetype="application/json"
            )      
        return data

@user_ns.route('/Update/<id>')
class UserUpdate(Resource):
    @user_ns.expect(user_update, validate=True)
    @user_ns.doc(security='BearerAuth')
    @token_required
    def patch(self,  id:str):   
        token_user_id = decodeJWT(request.headers['authorization'].split()[1])["user_id"]
        if str(token_user_id) != str(id):
            return Response(
                response=json.dumps({"error": "You are not authorized  to update   this user  profile."}),
                status=403,
                mimetype="application/json"
            )     
        userbody = request.get_json()
        try: 
            return UserService.UpdateUser(userbody, id)
        except: 
            return Response(
                response=json.dumps({"error": "can not update user data"}),
                status=400,
                mimetype="application/json"
            )         
@user_ns.route('/<id>/following')
class UserFollowing(Resource):
    @user_ns.doc(security='BearerAuth')
    @token_required
    def patch(self, id: str):
        NextUserID = decodeJWT(request.headers['authorization'].split()[1])["user_id"]
        try:
            return UserService.FollowingUser(id, NextUserID)
        except:
            return Response(
                response=json.dumps({"error": "can't follow the user"}),
                status=400,
                mimetype="application/json"
            )   

@user_ns.route('/getSug')
class UserSuggestions(Resource):
    @user_ns.expect(query_parser_id)
    def get(self):
        id =  request.args.get("id")
        try:
            return UserService.GetSugUsers(id)
        except:
            return Response(
                response=json.dumps({"message": "No Suggestion users"}),
                status=400,
                mimetype="application/json"
            )   
