import json 
from flask import request 
from extensions import user_connections
# DB schemas 
from DB.database import DataBase 
from bson import ObjectId

DB = DataBase.connect()
userSchema = DB.users 

# end of db s 

def notify_friends(user_id, event, data, socketio):
    socket_id = user_connections.get(user_id)
    if socket_id:
        socketio.emit(event, data, room=socket_id)

def get_followers(user_id: str):
    try:
        user = userSchema.find_one({"_id": ObjectId(user_id)})
        if user :
            related_ids = set(user.get("followers", []) + user.get("following", []))
            related_ids.discard(str(user["_id"]))  # Remove the user's own ID if present
            return list(related_ids)
        else:
            return []
    except Exception as e:
        print("Error fetching followers:", e)
        return []

def get_online_friends(user_id):
    online_friends = get_followers(user_id)
    if online_friends:
        return [friend_id for friend_id in online_friends if friend_id in user_connections]
    return []




def register_socket_events(socketio):
    @socketio.on('connect')
    def handle_connect():
        print(f"User connected: {request.sid}")

    @socketio.on('setUserId')
    def handle_set_user_id(user_id: str):
        if user_id:
            user_connections[user_id] = request.sid
            print(f"User {user_id} connected with SID: {request.sid}")

            try:
                # notify the use rabout thiar online friends 
                online_friends_ids = get_online_friends(user_id)
                notify_friends(user_id, 'onlineFriends', online_friends_ids, socketio)

                # notify all frids about their friends connection 
                user_friends = get_followers(user_id)
                if user_friends:
                    for friend_id in user_friends:
                        friend_socket_id = user_connections.get(friend_id)
                        if friend_socket_id:
                            socketio.emit('friendConnected', {'connectedUserId': user_id}, room=friend_socket_id)

                socketio.emit('userIdSet', {'userId': user_id})
                return "User ID set successfully"
            except Exception as e:
                print(f"Error setting user id   {e}")
        return "Faild to set user Id"
    
    @socketio.on('privateMessage')
    def handle_private_message(data):
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError:
                print("Invalid JSON data received")
                return
        to_user_id = data.get('toUserId')
        message = data.get('message')
        to_socket_id = user_connections.get(to_user_id)

        if to_socket_id:
            socketio.emit('privateMessage', {'fromUserId': message['sender'], 'message': message}, room=to_socket_id)
        else:
            print(f"User {to_user_id} is not connected. Message not sent.")

    @socketio.on('disconnect')
    def handle_disconnect(): 
        user_id = next((uid for uid, sid in user_connections.items() if sid == request.sid), None)
        if user_id:
            print(f"User {user_id} disconnected.")

            online_friends_ids = get_followers(user_id)
            for friend_id in online_friends_ids:
                friend_socket_id = user_connections.get(friend_id)
                if friend_socket_id:
                    socketio.emit('friendDisconnected', {'disconnectedUserId': user_id}, room=friend_socket_id)

            if user_id in user_connections:
                del user_connections[user_id]
        else:
            print(f"Unknown user disconnected with SID: {request.sid}")

def notify_user(user_id, notification_data, socketio):
    socket_id = user_connections.get(user_id)
    if socket_id:
        socketio.emit('receiveNotification', notification_data, room=socket_id)