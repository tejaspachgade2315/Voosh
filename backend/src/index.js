const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const config = require('./config');
const redisClient = require('./services/redis');
const ragService = require('./services/rag');
const { setupSocketHandlers } = require('./socket/handlers');

// Import routes
const sessionRoutes = require('./routes/session');
const chatRoutes = require('./routes/chat');

const app = express();
const server = http.createServer(app);

// Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: config.frontendUrl || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: config.frontendUrl || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/session', sessionRoutes);
app.use('/api/chat', chatRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'RAG News Chatbot API',
    version: '1.0.0',
    description: 'A RAG-powered chatbot for news websites',
    endpoints: {
      health: 'GET /health',
      createSession: 'POST /api/session',
      getSession: 'GET /api/session/:sessionId',
      getHistory: 'GET /api/session/:sessionId/history',
      clearHistory: 'DELETE /api/session/:sessionId/history',
      chat: 'POST /api/chat',
      chatStream: 'POST /api/chat/stream',
      status: 'GET /api/chat/status',
    },
    socket: {
      events: ['join_session', 'send_message', 'get_history', 'clear_history'],
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Initialize and start server
async function startServer() {
  try {
    // Connect to Redis
    await redisClient.connect();
    
    // Initialize RAG service
    await ragService.initialize();
    
    // Setup Socket.IO handlers
    setupSocketHandlers(io);
    
    // Start server
    server.listen(config.port, () => {
      console.log(`
🚀 RAG News Chatbot Backend Started!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Server: http://localhost:${config.port}
🔌 Socket.IO: ws://localhost:${config.port}
🌍 Environment: ${config.nodeEnv}
📚 Documents indexed: ${ragService.getDocumentCount()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await redisClient.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await redisClient.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();
