from flask import Flask
from flask_socketio import SocketIO

socketio = SocketIO()

def create_app():
    app = Flask(__name__)
    # app.config['SECRET_KEY'] = '8a260a78722081244830d86f137ca1e037e9be1c9ddbc6501afc94a86eedf94c'
    
    socketio.init_app(app, cors_allowed_origins="*")
    
    from . import routes
    app.register_blueprint(routes.bp)
    
    return app