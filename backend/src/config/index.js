require('dotenv').config();

module.exports = {
  // Server configuration
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // API Keys
  geminiApiKey: process.env.GEMINI_API_KEY,
  jinaApiKey: process.env.JINA_API_KEY,
  
  // Redis configuration
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Session configuration
  sessionTTL: parseInt(process.env.SESSION_TTL) || 86400, // 24 hours in seconds
  
  // Vector store configuration
  vectorStorePath: process.env.VECTOR_STORE_PATH || './data/vector_store',
  
  // RAG configuration
  rag: {
    topK: 5, // Number of relevant passages to retrieve
    chunkSize: 500, // Characters per chunk
    chunkOverlap: 100, // Overlap between chunks
  },
  
  // Frontend URL for CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Cache TTL configurations (in seconds)
  cacheTTL: {
    sessionHistory: 86400, // 24 hours
    embeddings: 604800, // 7 days
    queryCache: 3600, // 1 hour for query responses
  }
};
