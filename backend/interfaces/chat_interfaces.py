from flask_restx import Namespace, fields

chat_ns = Namespace('chat', description='Chat related operations')

message_model = chat_ns.model('Message', {
    'content': fields.String(required=True, description='The content of the message'),
    'sender': fields.String(required=True, description='The sender of the message'),
    'recever': fields.String(required=True, description='The recever of the message')
})

chatquery_from_fsuid = chat_ns.parser()

chatquery_from_fsuid.add_argument('from', type=int, required=True, help='Starting point for fetching messages', location='args')
chatquery_from_fsuid.add_argument('firstuid', type=str, required=True, help='The ID of the first user', location='args')
chatquery_from_fsuid.add_argument('seconduid', type=str, required=True, help='The ID of the second user', location='args')

chatquery_uid = chat_ns.parser()
chatquery_uid.add_argument('userid', type=str, required=True, help='The ID of the user', location='args')


chatquery_main_other = chat_ns.parser()
chatquery_main_other.add_argument('mainuid', type=str, required=True, help='The ID of the main user', location='args')
chatquery_main_other.add_argument('otheruid', type=str, required=True, help='The ID of the other user', location='args')