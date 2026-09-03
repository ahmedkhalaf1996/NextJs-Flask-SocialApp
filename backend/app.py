import threading 
from flask import Flask, request
from flask_cors import CORS
from flask_restx import Api
from flask_socketio import SocketIO
from extensions import socketio, user_connections

# Rest Routers 
from router.user import  user_ns
from router.posts import post_ns
from router.comments import comment_ns
from router.notify import notifications_ns
from router.chat import chat_ns

# socket 
from socket_events import register_socket_events

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio.init_app(app)

api = Api(app, 
          authorizations={
              'BearerAuth': {
                  'type': 'apiKey',
                  'in': 'header',
                  'name': 'Authorization'
              }
          },
          version='1.0', 
          title='Realtime Social Server', 
          description='Unified Server For Api, chat , and notifications',
          doc='/docs'
          )

# Register Namespaces
api.add_namespace(user_ns)
api.add_namespace(post_ns)
api.add_namespace(comment_ns)
api.add_namespace(notifications_ns)
api.add_namespace(chat_ns)
# Map Socketio events 
register_socket_events(socketio)

if __name__ == '__main__':
    print("Starting Realtime Social Server on port 5000...")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=True)