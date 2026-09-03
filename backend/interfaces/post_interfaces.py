from flask_restx import Namespace, fields

post_ns = Namespace('posts', description='Post related operations')

post_create = post_ns.model('CreatePost', {
    'title': fields.String(required=True, description='The post title '),
    'message': fields.String(required=True, description='The post message '),
    'selectedFile': fields.String(required=True, description='The post selectedFile '),

})

post_update = post_ns.model('UpdatePost', {
    'title': fields.String(required=True, description='The post title '),
    'message': fields.String(required=True, description='The post message '),
    'selectedFile': fields.String(required=True, description='The post selectedFile '),
})

comment_create = post_ns.model('CreateComment', {
    'value': fields.String(required=True, description='The comment text ')
})



post_q_search = post_ns.parser()

post_q_search.add_argument('searchQuery',type=str,required=True,help='search qury for users and posts', location='args')
post_q_search.add_argument('page',type=int,required=False,help='search result page', location='args')
post_q_search.add_argument('id',type=str,required=False,help='curent user id..', location='args')



post_q_get  = post_ns.parser()
post_q_get.add_argument('id',type=str,required=True,help='id query for posts', location='args')
post_q_get.add_argument('page',type=str,required=True,help='page query for posts', location='args')
