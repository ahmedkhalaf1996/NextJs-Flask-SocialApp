from flask_restx import fields, Namespace

notifications_ns = Namespace('notification', description='Noificaion related operations')

query_parser_id = notifications_ns.parser()
query_parser_id.add_argument('id', type=str, required=True, help='Notification ID', location='args')


