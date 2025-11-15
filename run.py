# from dotenv import load_dotenv
# load_dotenv()  # This loads variables from .env file

from app import create_app, socketio
import os

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))

    print(f"🚀 Starting Python Chat Application... on port {port}")
    print(f"📍 Access the app at: http://localhost:{port}") 

    # Allow all origins for development purposes
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=False,
        allow_unsafe_werkzeug=True
    )
    #print("🚀 Starting Python Chat Application...")
    #print("📍 Access the app at: http://localhost:5000")
    #print("💡 Open multiple browser windows to test the chat!")
    #socketio.run(app, debug=True, host='0.0.0.0', port=5000)