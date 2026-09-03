import json 
from flask import Blueprint, request, Response
from flask_restx import Namespace, Resource

from services.chatService import ChatService

from auth.auth_bearer import token_required
from auth.auth_handler import decodeJWT
from interfaces.chat_interfaces import chat_ns, message_model, chatquery_from_fsuid, chatquery_uid, chatquery_main_other

chat_router = Blueprint('chat', __name__)

@chat_ns.route('/sendmessage')
class SendMessage(Resource):
    @chat_ns.expect(message_model, validate=True)
    def post(self):
        try:
            data = request.get_json()

            return ChatService.sendMessage(data)

  
        except:
            return Response(
                json.dumps({'error': 'Failed to send message'}),
                  status=500, 
                  mimetype='application/json'
                  )

@chat_ns.route('/getmsgsbynums')
class GetMsgsByNums(Resource):
    @chat_ns.expect(chatquery_from_fsuid, validate=True)
    def get(self):
        try:
          from_val = int(request.args.get('from', 0))
          firstuid = request.args.get('firstuid')
          seconduid = request.args.get('seconduid')

          return ChatService.GetMsgByNums(from_val, firstuid, seconduid)

        except Exception as e:
            return Response(
                json.dumps({'error': str(e)}),
                status=500,
                mimetype='application/json'
            )

@chat_ns.route('/get-user-unreadedmsg')
class GetUserUnreadedMsgs(Resource):
    @chat_ns.expect(chatquery_uid, validate=True)
    def get(self):
        try:
            userid = request.args.get('userid')
            if not userid:
                return Response(
                    json.dumps({'error': 'Missing userid parameter'}),
                    status=400,
                    mimetype='application/json'
                )
            return ChatService.GetUserUnReadedMsg(userid)
        except Exception as e:
            return Response(
                json.dumps({'error': str(e)}),
                status=500,
                mimetype='application/json'
            )

@chat_ns.route('/mark-msg-asreaded')
class MarkMsgAsRead(Resource):
    @chat_ns.expect(chatquery_main_other, validate=True)
    def post(self):
        try:
            mainuid = request.args.get('mainuid')
            otheruid = request.args.get('otheruid')
            if not mainuid or not otheruid:
                return Response(
                    json.dumps({'error': 'Missing mainuid or otheruid parameter'}),
                    status=400,
                    mimetype='application/json'
                )
            return ChatService.MarkMsgAsReaded(mainuid, otheruid)
        except Exception as e:
            return Response(
                json.dumps({'error': str(e)}),
                status=500,
                mimetype='application/json'
            )