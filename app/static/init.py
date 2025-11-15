from flask import Flask
from flask_socketio import SocketIO
import os

socketio = SocketIO()

def create_app():
    app = Flask(__name__)
    
    # Use environment variable or generate a secure key
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', os.urandom(24).hex())
    
    # Initialize SocketIO with CORS for all origins (adjust in production)
    socketio.init_app(app, 
        cors_allowed_origins="*",  # For development - restrict in production
        async_mode='eventlet'
    )
    
    from . import routes
    app.register_blueprint(routes.bp)
    
    return app