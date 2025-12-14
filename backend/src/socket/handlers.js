const sessionService = require('../services/session');
const ragService = require('../services/rag');

/**
 * Setup Socket.IO handlers for real-time chat
 * @param {import('socket.io').Server} io - Socket.IO server instance
 */
function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    let currentSessionId = null;
    
    // Handle session creation/joining
    socket.on('join_session', async (data) => {
      try {
        let session;
        
        if (data?.sessionId) {
          // Validate existing session
          const isValid = await sessionService.validateSession(data.sessionId);
          if (isValid) {
            session = await sessionService.getSession(data.sessionId);
            currentSessionId = data.sessionId;
          }
        }
        
        if (!session) {
          // Create new session
          session = await sessionService.createSession();
          currentSessionId = session.id;
        }
        
        // Join socket room for this session
        socket.join(currentSessionId);
        
        // Get existing history
        const history = await sessionService.getHistory(currentSessionId);
        
        socket.emit('session_joined', {
          success: true,
          session,
          history,
        });
        
        console.log(`📝 Socket ${socket.id} joined session: ${currentSessionId}`);
      } catch (error) {
        console.error('Join session error:', error);
        socket.emit('error', { message: 'Failed to join session' });
      }
    });
    
    // Handle chat messages
    socket.on('send_message', async (data) => {
      try {
        const { message } = data;
        const sessionId = currentSessionId || data.sessionId;
        
        if (!sessionId) {
          socket.emit('error', { message: 'No active session' });
          return;
        }
        
        if (!message || !message.trim()) {
          socket.emit('error', { message: 'Message is required' });
          return;
        }
        
        // Emit that we're processing
        socket.emit('message_received', {
          message: message.trim(),
          timestamp: new Date().toISOString(),
        });
        
        // Process with streaming
        socket.emit('response_start', { timestamp: new Date().toISOString() });
        
        const result = await ragService.processQueryStream(
          sessionId,
          message.trim(),
          (chunk) => {
            socket.emit('response_chunk', { content: chunk });
          }
        );
        
        socket.emit('response_complete', {
          answer: result.answer,
          sources: result.sources,
          timestamp: new Date().toISOString(),
        });
        
      } catch (error) {
        console.error('Message error:', error);
        
        if (error.message === 'Invalid or expired session') {
          socket.emit('session_expired', { message: 'Session expired, please create a new one' });
        } else {
          socket.emit('error', { message: 'Failed to process message' });
        }
      }
    });
    
    // Handle getting history
    socket.on('get_history', async (data) => {
      try {
        const sessionId = currentSessionId || data?.sessionId;
        
        if (!sessionId) {
          socket.emit('error', { message: 'No active session' });
          return;
        }
        
        const history = await sessionService.getHistory(sessionId);
        socket.emit('history', { messages: history });
      } catch (error) {
        console.error('Get history error:', error);
        socket.emit('error', { message: 'Failed to get history' });
      }
    });
    
    // Handle clearing history
    socket.on('clear_history', async (data) => {
      try {
        const sessionId = currentSessionId || data?.sessionId;
        
        if (!sessionId) {
          socket.emit('error', { message: 'No active session' });
          return;
        }
        
        await sessionService.clearHistory(sessionId);
        socket.emit('history_cleared', { success: true });
        
        // Notify others in the same session
        socket.to(sessionId).emit('history_cleared', { success: true });
      } catch (error) {
        console.error('Clear history error:', error);
        socket.emit('error', { message: 'Failed to clear history' });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      if (currentSessionId) {
        socket.leave(currentSessionId);
      }
    });
  });
}

module.exports = { setupSocketHandlers };
