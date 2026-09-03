import json 
from flask import request, Response, Blueprint
from flask_restx import Namespace, Resource
from services.notifyService import NotificationService
from interfaces.notify_interfaces import notifications_ns, query_parser_id

notification_router = Blueprint('notification', __name__)

@notifications_ns.route('/mark-notification-asreaded')
class MarkNotificationAsRead(Resource):
    @notifications_ns.expect(query_parser_id, validate=True)
    def get(self):
        try:
            id = request.args.get("id")
            return NotificationService.MarknotAsReaded(id)
        except Exception as e:
            print(e)
            return Response(
                response=json.dumps({"messsage": "Internal server error"}),
                status=500,
                mimetype="application/json"
            )

@notifications_ns.route('/<userid>')
class UserNoifications(Resource):
    def get(self, userid: str):
        try:
            return NotificationService.getuserNotificaion(userid)
        except Exception as e:
            print(e)
            return Response(
                response=json.dumps({"messsage": "Internal server error"}),
                status=500,
                mimetype="application/json"
            )