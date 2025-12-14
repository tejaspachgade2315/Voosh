import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
    this.sessionId = null;
    this.callbacks = {};
  }

  connect() {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      if (this.callbacks.connect) {
        this.callbacks.connect();
      }
    });

    this.socket.on('disconnect', () => {
      if (this.callbacks.disconnect) {
        this.callbacks.disconnect();
      }
    });

    this.socket.on('session_joined', (data) => {
      this.sessionId = data.session?.id;
      if (this.callbacks.sessionJoined) {
        this.callbacks.sessionJoined(data);
      }
    });

    this.socket.on('message_received', (data) => {
      if (this.callbacks.messageReceived) {
        this.callbacks.messageReceived(data);
      }
    });

    this.socket.on('response_start', (data) => {
      if (this.callbacks.responseStart) {
        this.callbacks.responseStart(data);
      }
    });

    this.socket.on('response_chunk', (data) => {
      if (this.callbacks.responseChunk) {
        this.callbacks.responseChunk(data);
      }
    });

    this.socket.on('response_complete', (data) => {
      if (this.callbacks.responseComplete) {
        this.callbacks.responseComplete(data);
      }
    });

    this.socket.on('error', (data) => {
      if (this.callbacks.error) {
        this.callbacks.error(data);
      }
    });

    this.socket.on('session_expired', (data) => {
      if (this.callbacks.sessionExpired) {
        this.callbacks.sessionExpired(data);
      }
    });

    this.socket.on('history', (data) => {
      if (this.callbacks.history) {
        this.callbacks.history(data);
      }
    });

    this.socket.on('history_cleared', (data) => {
      if (this.callbacks.historyCleared) {
        this.callbacks.historyCleared(data);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.sessionId = null;
    }
  }

  joinSession(sessionId) {
    if (this.socket) {
      this.sessionId = sessionId;
      this.socket.emit('join_session', { sessionId });
    }
  }

  sendMessage(message) {
    if (this.socket && this.sessionId) {
      this.socket.emit('send_message', {
        sessionId: this.sessionId,
        message,
      });
    }
  }

  getHistory() {
    if (this.socket && this.sessionId) {
      this.socket.emit('get_history', { sessionId: this.sessionId });
    }
  }

  clearHistory() {
    if (this.socket && this.sessionId) {
      this.socket.emit('clear_history', { sessionId: this.sessionId });
    }
  }

  // Callback setters
  onConnect(callback) {
    this.callbacks.connect = callback;
  }

  onDisconnect(callback) {
    this.callbacks.disconnect = callback;
  }

  onSessionJoined(callback) {
    this.callbacks.sessionJoined = callback;
  }

  onMessageReceived(callback) {
    this.callbacks.messageReceived = callback;
  }

  onResponseStart(callback) {
    this.callbacks.responseStart = callback;
  }

  onResponseChunk(callback) {
    this.callbacks.responseChunk = callback;
  }

  onResponseComplete(callback) {
    this.callbacks.responseComplete = callback;
  }

  onError(callback) {
    this.callbacks.error = callback;
  }

  onSessionExpired(callback) {
    this.callbacks.sessionExpired = callback;
  }

  onHistory(callback) {
    this.callbacks.history = callback;
  }

  onHistoryCleared(callback) {
    this.callbacks.historyCleared = callback;
  }
}

export const socketService = new SocketService();
