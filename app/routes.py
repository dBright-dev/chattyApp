from flask import Blueprint, render_template, request
from flask_socketio import emit, join_room, leave_room
from app import socketio
import time

bp = Blueprint('main', __name__)

# Store active users and rooms
active_users = {}
rooms = {}

@bp.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    user_id = request.sid
    if user_id in active_users:
        user_data = active_users[user_id]
        room_id = user_data['room_id']
        username = user_data['username']
        
        # Remove user from active users
        del active_users[user_id]
        
        # Update room users
        if room_id in rooms:
            if user_id in rooms[room_id]['users']:
                del rooms[room_id]['users'][user_id]
            
            # Notify others in the room
            emit('user_left', {
                'username': username,
                'timestamp': time.time(),
                'active_users': list(rooms[room_id]['users'].values())
            }, room=room_id)
            
            # Clean up empty rooms
            if not rooms[room_id]['users']:
                del rooms[room_id]
        
        print(f'User {username} disconnected')

@socketio.on('leave_room')
def handle_leave_room():
    user_id = request.sid
    if user_id in active_users:
        user_data = active_users[user_id]
        room_id = user_data['room_id']
        username = user_data['username']
        
        # Leave the SocketIO room
        leave_room(room_id)
        
        # Remove user from active users
        del active_users[user_id]
        
        # Update room users
        if room_id in rooms:
            if user_id in rooms[room_id]['users']:
                del rooms[room_id]['users'][user_id]
            
            # Notify others in the room
            emit('user_left', {
                'username': username,
                'timestamp': time.time(),
                'active_users': list(rooms[room_id]['users'].values())
            }, room=room_id)
            
            # Clean up empty rooms
            if not rooms[room_id]['users']:
                del rooms[room_id]
        
        print(f'User {username} left room {room_id}')

@socketio.on('join_room')
def handle_join_room(data):
    room_id = data['room_id']
    username = data['username']
    user_id = request.sid
    
    # If user was already in a room, leave it first
    if user_id in active_users:
        old_room_id = active_users[user_id]['room_id']
        if old_room_id != room_id:
            leave_room(old_room_id)
            if old_room_id in rooms and user_id in rooms[old_room_id]['users']:
                del rooms[old_room_id]['users'][user_id]
    
    # Store user information
    active_users[user_id] = {
        'username': username,
        'room_id': room_id
    }
    
    # Initialize room if it doesn't exist
    if room_id not in rooms:
        rooms[room_id] = {
            'users': {},
            'messages': []
        }
    
    # Add user to room
    rooms[room_id]['users'][user_id] = username
    
    # Join the SocketIO room
    join_room(room_id)
    
    # Send room history to the new user
    emit('room_history', {
        'messages': rooms[room_id]['messages'][-50:],  # Last 50 messages
        'active_users': list(rooms[room_id]['users'].values())
    })
    
    # Notify others in the room
    emit('user_joined', {
        'username': username,
        'timestamp': time.time(),
        'active_users': list(rooms[room_id]['users'].values())
    }, room=room_id)
    
    print(f'User {username} joined room {room_id}')

@socketio.on('send_message')
def handle_send_message(data):
    user_id = request.sid
    if user_id not in active_users:
        return
    
    user_data = active_users[user_id]
    username = user_data['username']
    room_id = user_data['room_id']
    message_content = data['message']
    
    # Create message object
    message = {
        'id': str(time.time()),
        'username': username,
        'message': message_content,
        'timestamp': time.time(),
        'type': 'user_message'
    }
    
    # Store message in room history
    if room_id in rooms:
        rooms[room_id]['messages'].append(message)
        # Keep only last 100 messages
        if len(rooms[room_id]['messages']) > 100:
            rooms[room_id]['messages'] = rooms[room_id]['messages'][-100:]
    
    # Broadcast message to room
    emit('new_message', message, room=room_id)

@socketio.on('typing_start')
def handle_typing_start():
    user_id = request.sid
    if user_id not in active_users:
        return
    
    user_data = active_users[user_id]
    username = user_data['username']
    room_id = user_data['room_id']
    
    emit('user_typing', {
        'username': username,
        'is_typing': True
    }, room=room_id)

@socketio.on('typing_stop')
def handle_typing_stop():
    user_id = request.sid
    if user_id not in active_users:
        return
    
    user_data = active_users[user_id]
    username = user_data['username']
    room_id = user_data['room_id']
    
    emit('user_typing', {
        'username': username,
        'is_typing': False
    }, room=room_id)

    # health check endpoint for deployment testing
    @bp.route('/health')
    def health_check():
        return {
            'status': 'healthy',
            'service': 'chattyapp',
            'timestamp': time.time(),
            'active_users': len(active_users),
            'active_rooms': len(rooms)
        }