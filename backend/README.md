# RAG News Chatbot - Backend

A RAG (Retrieval-Augmented Generation) powered chatbot backend for answering questions about news articles using Node.js, Express, Redis, and Google Gemini API.

## 🚀 Features

- **RAG Pipeline**: Ingest, embed, and retrieve relevant news articles
- **Real-time Chat**: Socket.IO for streaming responses
- **Session Management**: Redis-based session and history management
- **Vector Search**: Fast similarity search for relevant content
- **Streaming Responses**: Real-time token-by-token responses from Gemini
- **RESTful API**: Full REST API for session and chat management

## 🛠 Tech Stack

| Technology | Purpose | Justification |
|------------|---------|---------------|
| **Node.js + Express** | Backend Framework | Fast, lightweight, excellent for real-time applications |
| **Socket.IO** | Real-time Communication | Enables streaming responses and bidirectional communication |
| **Redis** | Session & Cache Storage | In-memory storage for fast session retrieval, TTL support |
| **Jina Embeddings** | Text Embeddings | Free tier available, high-quality embeddings, easy API |
| **Google Gemini** | LLM for Generation | Free tier available, powerful model, good for RAG |
| **Custom Vector Store** | Embedding Storage | Lightweight, no external dependencies, file-based persistence |

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── index.js          # Configuration management
│   ├── routes/
│   │   ├── chat.js           # Chat API endpoints
│   │   └── session.js        # Session API endpoints
│   ├── services/
│   │   ├── embedding.js      # Jina embeddings service
│   │   ├── gemini.js         # Google Gemini LLM service
│   │   ├── rag.js            # RAG pipeline orchestration
│   │   ├── redis.js          # Redis client with fallback
│   │   ├── session.js        # Session management
│   │   └── vectorStore.js    # Vector storage and search
│   ├── socket/
│   │   └── handlers.js       # Socket.IO event handlers
│   ├── scripts/
│   │   └── ingestNews.js     # News ingestion script
│   └── index.js              # Application entry point
├── data/
│   └── vector_store/         # Persisted embeddings
├── package.json
├── .env.example
└── README.md
```

## 🔧 Installation

### Prerequisites

- Node.js 18+
- Redis (optional, has in-memory fallback)
- API Keys for Gemini and Jina (optional)

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Ingest news articles**
   ```bash
   npm run ingest
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | Environment (development/production) |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `JINA_API_KEY` | No | Jina Embeddings API key |
| `REDIS_URL` | No | Redis connection URL |
| `SESSION_TTL` | No | Session TTL in seconds (default: 86400) |
| `FRONTEND_URL` | No | Frontend URL for CORS |

## 📡 API Endpoints

### Session Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/session` | Create new session |
| `GET` | `/api/session/:id` | Get session details |
| `GET` | `/api/session/:id/history` | Get chat history |
| `DELETE` | `/api/session/:id/history` | Clear chat history |
| `DELETE` | `/api/session/:id` | Delete session |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Send message (non-streaming) |
| `POST` | `/api/chat/stream` | Send message (SSE streaming) |
| `GET` | `/api/chat/status` | Get system status |

### Socket.IO Events

**Client → Server:**
- `join_session` - Join/create session
- `send_message` - Send chat message
- `get_history` - Request chat history
- `clear_history` - Clear chat history

**Server → Client:**
- `session_joined` - Session joined successfully
- `response_start` - Response generation started
- `response_chunk` - Streaming response chunk
- `response_complete` - Full response with sources
- `history` - Chat history
- `history_cleared` - History cleared
- `error` - Error occurred
- `session_expired` - Session expired

## 🧠 RAG Pipeline Flow

```
1. User Query
       ↓
2. Session Validation (Redis)
       ↓
3. Retrieve Chat History (Redis)
       ↓
4. Generate Query Embedding (Jina AI)
       ↓
5. Vector Similarity Search (Top-K)
       ↓
6. Build Context from Retrieved Passages
       ↓
7. Generate Response (Gemini API)
       ↓
8. Save to Chat History (Redis)
       ↓
9. Return Response (with sources)
```

## 💾 Caching Strategy

### Redis Caching

| Data Type | TTL | Purpose |
|-----------|-----|---------|
| Session Data | 24 hours | User session metadata |
| Chat History | 24 hours | Conversation messages |
| Embeddings | 7 days | Cached embeddings |
| Query Responses | 1 hour | Cached LLM responses |

### TTL Configuration

Configure TTLs in `src/config/index.js`:

```javascript
cacheTTL: {
  sessionHistory: 86400,  // 24 hours
  embeddings: 604800,     // 7 days
  queryCache: 3600,       // 1 hour
}
```

### Cache Warming

For production, pre-compute embeddings for common queries:

```javascript
// Example cache warming script
const commonQueries = [
  "What are the latest news?",
  "Technology updates",
  "Business headlines"
];

for (const query of commonQueries) {
  await vectorStore.search(query); // Pre-cache embeddings
}
```

## 🚀 Deployment

### Deploy to Render.com

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**: Add all required env vars

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Pre-ingest news data
RUN npm run ingest

EXPOSE 3001
CMD ["npm", "start"]
```

### Redis for Production

Use managed Redis services:
- **Upstash** (serverless, free tier)
- **Redis Cloud** (managed)
- **Railway Redis**

## 📊 Performance Considerations

1. **Embedding Caching**: Embeddings are persisted to disk
2. **Session TTL**: Auto-expire inactive sessions
3. **Batch Processing**: News ingestion in batches of 10
4. **Connection Pooling**: Redis connection reuse
5. **Streaming**: Token-by-token response delivery

## 🧪 Testing

```bash
# Test API health
curl http://localhost:3001/health

# Create session
curl -X POST http://localhost:3001/api/session

# Send message
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "your-session-id", "message": "What are the latest headlines?"}'
```

## 📝 License

MIT License

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request
