class ChatApp {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentRoom = null;
        this.typingTimeout = null;
        this.isTyping = false;
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.joinChat();
        });
        
        // Message form
        document.getElementById('message-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
        
        // Leave button
        document.getElementById('leave-btn').addEventListener('click', () => {
            this.leaveRoom();
        });
        
        // Typing detection
        document.getElementById('message-input').addEventListener('input', () => {
            this.handleTyping();
        });
    }
    
    connectSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            this.updateConnectionStatus(true);
            console.log('Connected to server');
        });
        
        this.socket.on('disconnect', () => {
            this.updateConnectionStatus(false);
            console.log('Disconnected from server');
        });
        
        this.socket.on('room_history', (data) => {
            this.displayRoomHistory(data);
        });
        
        this.socket.on('new_message', (message) => {
            this.displayMessage(message);
        });
        
        this.socket.on('user_joined', (data) => {
            this.displaySystemMessage(`${data.username} joined the room`);
            this.updateUsersList(data.active_users);
        });
        
        this.socket.on('user_left', (data) => {
            this.displaySystemMessage(`${data.username} left the room`);
            this.updateUsersList(data.active_users);
        });
        
        this.socket.on('user_typing', (data) => {
            this.handleUserTyping(data);
        });
    }
    
    joinChat() {
        const username = document.getElementById('username').value.trim();
        const roomId = document.getElementById('room-id').value.trim();
        
        if (!username || !roomId) {
            alert('Please enter both username and room ID');
            return;
        }
        
        this.currentUser = username;
        this.currentRoom = roomId;
        
        this.connectSocket();
        
        // Wait for socket to connect before joining room
        if (this.socket.connected) {
            this.joinRoom(username, roomId);
        } else {
            this.socket.on('connect', () => {
                this.joinRoom(username, roomId);
            });
        }
    }
    
    joinRoom(username, roomId) {
        this.socket.emit('join_room', {
            username: username,
            room_id: roomId
        });
        
        document.getElementById('current-room').textContent = roomId;
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('chat-page').classList.remove('hidden');
        
        // Focus on message input
        document.getElementById('message-input').focus();
    }
    
    leaveRoom() {
        if (this.socket) {
            this.socket.disconnect();
        }
        
        this.currentUser = null;
        this.currentRoom = null;
        this.isTyping = false;
        
        document.getElementById('chat-page').classList.add('hidden');
        document.getElementById('login-page').classList.remove('hidden');
        document.getElementById('messages-container').innerHTML = '';
        document.getElementById('users-list').innerHTML = '';
        
        // Clear login form
        document.getElementById('username').value = '';
    }
    
    sendMessage() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();
        
        if (!message || !this.socket) return;
        
        this.socket.emit('send_message', {
            message: message
        });
        
        messageInput.value = '';
        
        // Stop typing indicator
        if (this.isTyping) {
            this.socket.emit('typing_stop');
            this.isTyping = false;
            clearTimeout(this.typingTimeout);
        }
    }
    
    handleTyping() {
        if (!this.isTyping) {
            this.isTyping = true;
            this.socket.emit('typing_start');
        }
        
        // Clear existing timeout
        clearTimeout(this.typingTimeout);
        
        // Set new timeout
        this.typingTimeout = setTimeout(() => {
            this.isTyping = false;
            this.socket.emit('typing_stop');
        }, 1000);
    }
    
    handleUserTyping(data) {
        const typingIndicator = document.getElementById('typing-indicator');
        const typingText = document.getElementById('typing-text');
        
        if (data.is_typing) {
            typingText.textContent = `${data.username} is typing...`;
            typingIndicator.classList.remove('hidden');
        } else {
            typingIndicator.classList.add('hidden');
        }
    }
    
    displayRoomHistory(data) {
        const messagesContainer = document.getElementById('messages-container');
        messagesContainer.innerHTML = '';
        
        data.messages.forEach(message => {
            this.displayMessage(message);
        });
        
        this.updateUsersList(data.active_users);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    displayMessage(message) {
        const messagesContainer = document.getElementById('messages-container');
        const messageElement = document.createElement('div');
        
        const messageTime = new Date(message.timestamp * 1000).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        if (message.type === 'user_message') {
            const isOwnMessage = message.username === this.currentUser;
            
            messageElement.className = `message ${isOwnMessage ? 'own' : 'other'}`;
            messageElement.innerHTML = `
                <div class="message-header">
                    <span class="message-username">${message.username}</span>
                    <span class="message-time">${messageTime}</span>
                </div>
                <div class="message-content">${this.escapeHtml(message.message)}</div>
            `;
        } else {
            messageElement.className = 'message system';
            messageElement.textContent = message.message;
        }
        
        messagesContainer.appendChild(messageElement);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    displaySystemMessage(content) {
        const messagesContainer = document.getElementById('messages-container');
        const messageElement = document.createElement('div');
        
        messageElement.className = 'message system';
        messageElement.textContent = content;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    updateUsersList(users) {
        const usersList = document.getElementById('users-list');
        const userCount = document.getElementById('user-count');
        
        userCount.textContent = `${users.length} users online`;
        
        usersList.innerHTML = '';
        
        users.forEach(username => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.innerHTML = `
                <span class="user-status"></span>
                <span class="user-name">${username}${username === this.currentUser ? ' (You)' : ''}</span>
            `;
            usersList.appendChild(userElement);
        });
    }
    
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        const statusText = statusElement.querySelector('.status-text');
        const joinButton = document.getElementById('join-btn');
        
        if (connected) {
            statusElement.className = 'status connected';
            statusText.textContent = 'Connected';
            joinButton.disabled = false;
            joinButton.textContent = 'Join Chat';
        } else {
            statusElement.className = 'status disconnected';
            statusText.textContent = 'Disconnected';
            joinButton.disabled = true;
            joinButton.textContent = 'Connecting...';
        }
    }
    
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize the chat app when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});