from functools import wraps
import json 
from bson import ObjectId
import jwt
from flask import Response, request, abort 

# db connction & getSchema 
from DB.database import DataBase 

DB = DataBase.connect()
userSchema = DB.users 

# ==================
JWT_SECRET = "justasecretkeythatishouldputherforthebackend"  
JWT_ALGORITHM = "HS256"

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
           auth_header = request.headers['Authorization']

           if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
           else: 
               return Response(
                   response=json.dumps({
                       "message": " Bearer token malformed.",
                       "data": None,
                       "error": "Unauthorized"
                   }),
                   status=401,
                   mimetype="application/json"
                   
               )
        else: 
            return Response(
                   response=json.dumps({
                       "message": "Token is missing.",
                       "data": None,
                       "error": "Unauthorized"
                   }),
                   status=401,
                   mimetype="application/json"
               )
        try: 
            data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            current_user = userSchema.find_one({"_id": ObjectId(data["user_id"])})
            if current_user is None:
                return Response(
                   response=json.dumps({
                       "message": "Invalid Authication token. User not found.",
                       "data": None,
                       "error": "Unauthorized"
                   }),
                   status=401,
                   mimetype="application/json"
               )
        except Exception as e:
            return Response(
                   response=json.dumps({
                       "message": "Something went wrong. Token is invalid.",
                       "data": None,
                       "error": str(e)
                   }),
                   status=500,
                   mimetype="application/json"
               )
        return f(*args, **kwargs)
    return decorated