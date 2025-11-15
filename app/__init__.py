import os
from flask import Flask
from flask_socketio import SocketIO

socketio = SocketIO()

def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-123')
    
    socketio.init_app(
        app, 
        cors_allowed_origins="*"
    )
    
    from app.routes import bp
    app.register_blueprint(bp)
    
    return app