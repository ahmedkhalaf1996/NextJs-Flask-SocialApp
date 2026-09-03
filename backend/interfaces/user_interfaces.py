from flask_restx import Namespace, fields

user_ns = Namespace('user', description='User related operations')

user_signup = user_ns.model('Signup', {
    'firstName': fields.String(required=True, description='The user\'s first name'),
    'lastName': fields.String(required=True, description='The user\'s last name'),
    'email': fields.String(required=True, description='The user\'s email address'),
    'password': fields.String(required=True, description='The user\'s password')
})

user_signin = user_ns.model('Signin', {
    'email': fields.String(required=True, description='The user\'s email address'),
    'password': fields.String(required=True, description='The user\'s password')
})

user_update = user_ns.model('Update', {
    'name': fields.String(required=True, description='The user\'s name'),
    'bio': fields.String(required=True, description='The user\'s bio'),
    'imageUrl': fields.String(required=True, description='The user\'s  imageUrl'),
})


query_parser_id  = user_ns.parser()
query_parser_id.add_argument('id',type=str,required=True,help='Userid', location='args')

user_get_parser = user_ns.parser()

user_get_parser.add_argument('userid',type=str,required=True,help='User id', location='args')
user_get_parser.add_argument('withPosts',type=str,required=False,help='include posts in respose  true/false', location='args')
user_get_parser.add_argument('page',type=str,required=False,help='Page number for posts pagination', location='args')
