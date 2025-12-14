# Code Walkthrough - RAG News Chatbot

This document provides a comprehensive explanation of the end-to-end flow of the RAG News Chatbot application.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [News Ingestion & Embedding Pipeline](#news-ingestion--embedding-pipeline)
3. [Vector Store Implementation](#vector-store-implementation)
4. [Redis Caching & Session Management](#redis-caching--session-management)
5. [RAG Query Processing](#rag-query-processing)
6. [Frontend-Backend Communication](#frontend-backend-communication)
7. [Design Decisions](#design-decisions)
8. [Potential Improvements](#potential-improvements)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Header    │  │   Chat      │  │     Socket.IO Client    │  │
│  │  Component  │  │  Container  │  │   (Real-time events)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER (Node.js/Express)                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │   REST Routes    │  │  Socket Handlers │  │   Services    │  │
│  │  /api/session    │  │   join_session   │  │  - RAG        │  │
│  │  /api/chat       │  │   send_message   │  │  - Embedding  │  │
│  └──────────────────┘  └──────────────────┘  │  - Gemini     │  │
│                                              │  - Session    │  │
│                                              │  - VectorStore│  │
│                                              └───────────────┘  │
└─────────┬──────────────────────────────┬────────────────────────┘
          │                              │
          ▼                              ▼
┌──────────────────┐          ┌──────────────────────────────────┐
│      Redis       │          │          External APIs           │
│  (or In-Memory)  │          │  ┌────────────┐  ┌────────────┐  │
│  - Sessions      │          │  │ Jina AI    │  │  Gemini    │  │
│  - Chat History  │          │  │ Embeddings │  │    API     │  │
└──────────────────┘          │  └────────────┘  └────────────┘  │
                              └──────────────────────────────────┘
```

---

## 2. News Ingestion & Embedding Pipeline

### Process Flow

```
RSS Feeds → Fetch Articles → Clean Text → Chunk Text → Generate Embeddings → Store in Vector DB
```

### Step-by-Step Explanation

#### Step 1: Fetch News from RSS Feeds
```javascript
// src/scripts/ingestNews.js
const NEWS_FEEDS = [
  { name: 'BBC News', url: 'http://feeds.bbci.co.uk/news/rss.xml' },
  { name: 'BBC Technology', url: 'http://feeds.bbci.co.uk/news/technology/rss.xml' },
  // ... more feeds
];

async function fetchFromRSS(maxArticles = 50) {
  const articles = [];
  
  for (const feed of NEWS_FEEDS) {
    const feedData = await parser.parseURL(feed.url);
    
    for (const item of feedData.items) {
      articles.push({
        title: item.title,
        content: cleanText(item.contentSnippet),
        source: feed.name,
        pubDate: item.pubDate,
      });
    }
  }
  
  return articles;
}
```

#### Step 2: Text Chunking
```javascript
// Split articles into smaller chunks for better retrieval
function chunkText(text, chunkSize = 500, overlap = 100) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + chunkSize;
    
    // Try to end at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      if (lastPeriod > start + chunkSize / 2) {
        end = lastPeriod + 1;
      }
    }
    
    chunks.push(text.slice(start, end));
    start = end - overlap;  // Overlap for context continuity
  }
  
  return chunks;
}
```

**Why Chunking?**
- LLMs have token limits
- Smaller chunks improve retrieval precision
- Overlap ensures context isn't lost at boundaries

#### Step 3: Generate Embeddings
```javascript
// src/services/embedding.js
async generateEmbeddings(texts) {
  // Using Jina AI Embeddings API
  const response = await axios.post(
    'https://api.jina.ai/v1/embeddings',
    {
      input: texts,
      model: 'jina-embeddings-v3',
    },
    {
      headers: { 'Authorization': `Bearer ${this.jinaApiKey}` }
    }
  );

  return response.data.data.map(item => item.embedding);
}
```

**Why Jina Embeddings?**
- Free tier available
- High-quality embeddings
- Easy API integration
- 384-dimensional vectors (efficient storage)

---

## 3. Vector Store Implementation

### Storage Structure

```javascript
// src/services/vectorStore.js
class VectorStore {
  constructor() {
    this.documents = [];    // Original text chunks
    this.embeddings = [];   // Vector representations
    this.metadata = [];     // Source info, titles, etc.
  }
}
```

### Adding Documents

```javascript
async addDocuments(docs) {
  const texts = docs.map(d => d.text);
  const embeddings = await embeddingService.generateEmbeddings(texts);
  
  for (let i = 0; i < docs.length; i++) {
    this.documents.push(docs[i].text);
    this.embeddings.push(embeddings[i]);
    this.metadata.push(docs[i].metadata);
  }
  
  await this.save();  // Persist to disk
}
```

### Similarity Search

```javascript
async search(query, topK = 5) {
  // 1. Embed the query
  const [queryEmbedding] = await embeddingService.generateEmbeddings(query);
  
  // 2. Calculate cosine similarity with all documents
  const similarities = this.embeddings.map((embedding, index) => ({
    index,
    score: this.cosineSimilarity(queryEmbedding, embedding),
  }));

  // 3. Sort and return top-K results
  similarities.sort((a, b) => b.score - a.score);
  const topResults = similarities.slice(0, topK);

  return topResults.map(result => ({
    text: this.documents[result.index],
    score: result.score,
    metadata: this.metadata[result.index],
  }));
}
```

### Cosine Similarity Calculation

```javascript
cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

**Why Custom Vector Store?**
- No external dependencies needed for demo
- File-based persistence
- Easy to understand and debug
- Can be swapped for Qdrant/Pinecone in production

---

## 4. Redis Caching & Session Management

### Session Creation

```javascript
// src/services/session.js
async createSession() {
  const sessionId = uuidv4();
  
  const sessionData = {
    id: sessionId,
    createdAt: new Date().toISOString(),
    messageCount: 0,
  };
  
  // Store with TTL (24 hours)
  await redis.setex(
    `session:${sessionId}`,
    86400,  // TTL in seconds
    JSON.stringify(sessionData)
  );
  
  return sessionData;
}
```

### Chat History Management

```javascript
// Add message to history (using Redis List)
async addMessage(sessionId, role, content) {
  const message = {
    id: uuidv4(),
    role,        // 'user' or 'assistant'
    content,
    timestamp: new Date().toISOString(),
  };
  
  // RPUSH: Add to end of list
  await redis.rpush(
    `history:${sessionId}`,
    JSON.stringify(message)
  );
  
  // Refresh TTL on activity
  await redis.expire(`history:${sessionId}`, 86400);
  
  return message;
}

// Retrieve history
async getHistory(sessionId, limit = 100) {
  // LRANGE: Get last N messages
  const messages = await redis.lrange(
    `history:${sessionId}`,
    -limit,
    -1
  );
  
  return messages.map(msg => JSON.parse(msg));
}
```

### TTL Configuration

```javascript
// src/config/index.js
cacheTTL: {
  sessionHistory: 86400,   // 24 hours - Active session data
  embeddings: 604800,      // 7 days - Cached embeddings
  queryCache: 3600,        // 1 hour - Repeated query responses
}
```

### Cache Warming Strategy

For production, pre-compute popular queries:

```javascript
// Warm cache during startup or via cron job
async function warmCache() {
  const popularQueries = [
    "latest news",
    "technology headlines",
    "business updates",
  ];
  
  for (const query of popularQueries) {
    // Pre-compute and cache embeddings
    await vectorStore.search(query);
  }
}
```

### In-Memory Fallback

For development without Redis:

```javascript
class InMemoryStore {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
  }
  
  async setex(key, seconds, value) {
    this.store.set(key, value);
    this.ttls.set(key, Date.now() + seconds * 1000);
  }
  
  async get(key) {
    this._checkExpiry(key);
    return this.store.get(key) || null;
  }
  
  _checkExpiry(key) {
    const expiry = this.ttls.get(key);
    if (expiry && Date.now() > expiry) {
      this.store.delete(key);
      this.ttls.delete(key);
    }
  }
}
```

---

## 5. RAG Query Processing

### Complete Pipeline

```javascript
// src/services/rag.js
async processQuery(sessionId, query) {
  // 1. Validate session
  const isValid = await sessionService.validateSession(sessionId);
  if (!isValid) throw new Error('Invalid session');

  // 2. Get chat history for context
  const history = await sessionService.getHistory(sessionId, 10);

  // 3. Retrieve relevant documents
  const relevantDocs = await vectorStore.search(query, 5);

  // 4. Save user message
  await sessionService.addMessage(sessionId, 'user', query);

  // 5. Generate response with Gemini
  const answer = await geminiService.generateResponse(
    query,
    relevantDocs,
    history
  );

  // 6. Save assistant response
  await sessionService.addMessage(sessionId, 'assistant', answer);

  // 7. Return response with sources
  return {
    answer,
    sources: relevantDocs.map(doc => ({
      text: doc.text.substring(0, 200) + '...',
      score: doc.score,
      metadata: doc.metadata,
    })),
  };
}
```

### Gemini Prompt Engineering

```javascript
// src/services/gemini.js
async generateResponse(query, context, chatHistory) {
  const systemPrompt = `You are a helpful news assistant chatbot. 
Your role is to answer questions about recent news articles based on the provided context.

IMPORTANT GUIDELINES:
1. Only answer based on the provided news context
2. If the context doesn't contain relevant information, say so politely
3. Cite sources when possible (e.g., "According to Source 1...")
4. Keep responses concise but informative
5. Be conversational and helpful

NEWS CONTEXT:
${context.map((doc, idx) => `[Source ${idx + 1}]: ${doc.text}`).join('\n\n')}`;

  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'I understand. Ready to help.' }] },
    ...chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    })),
    { role: 'user', parts: [{ text: query }] }
  ];

  const result = await this.model.generateContent({ contents });
  return result.response.text();
}
```

---

## 6. Frontend-Backend Communication

### Socket.IO Connection Flow

```javascript
// src/services/socket.js (Frontend)
class SocketService {
  connect() {
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    
    // Setup event listeners
    this.socket.on('session_joined', this.handleSessionJoined);
    this.socket.on('response_chunk', this.handleChunk);
    this.socket.on('response_complete', this.handleComplete);
  }
  
  joinSession(sessionId) {
    this.socket.emit('join_session', { sessionId });
  }
  
  sendMessage(message) {
    this.socket.emit('send_message', { message });
  }
}
```

### Streaming Response Handling

```javascript
// Frontend (App.js)
socketService.onResponseChunk((data) => {
  // Append each token to streaming message
  setStreamingMessage(prev => prev + data.content);
});

socketService.onResponseComplete((data) => {
  setStreamingMessage('');  // Clear streaming
  
  // Add complete message with sources
  setMessages(prev => [...prev, {
    role: 'assistant',
    content: data.answer,
    sources: data.sources,
  }]);
});
```

### Backend Socket Handlers

```javascript
// src/socket/handlers.js
socket.on('send_message', async (data) => {
  // Emit start signal
  socket.emit('response_start');
  
  // Process with streaming callback
  const result = await ragService.processQueryStream(
    sessionId,
    message,
    (chunk) => {
      // Send each token as it's generated
      socket.emit('response_chunk', { content: chunk });
    }
  );
  
  // Send final complete message
  socket.emit('response_complete', {
    answer: result.answer,
    sources: result.sources,
  });
});
```

---

## 7. Design Decisions

### Why File-Based Vector Store?
- **Pros**: No external dependencies, simple to deploy, good for demo
- **Cons**: Limited scalability, no advanced features
- **Production Alternative**: Qdrant, Pinecone, or Weaviate

### Why In-Memory Redis Fallback?
- Allows development without Redis installed
- Seamless switch between development and production
- Same API interface for both implementations

### Why Socket.IO Over Just REST?
- Real-time streaming responses
- Bidirectional communication
- Automatic reconnection
- Room-based session management

### Why Jina Embeddings?
- Free tier available (vs OpenAI's paid API)
- High-quality embeddings
- Good documentation
- Simple API

### Why Google Gemini?
- Free tier available
- Powerful model performance
- Streaming support
- Easy integration

---

## 8. Potential Improvements

### Short-term Improvements

1. **Query Caching**
   ```javascript
   // Cache repeated queries
   const cacheKey = `query:${hash(query)}`;
   const cached = await redis.get(cacheKey);
   if (cached) return JSON.parse(cached);
   ```

2. **Batch Embedding Generation**
   ```javascript
   // Process multiple queries at once
   const embeddings = await generateEmbeddings(queries);
   ```

3. **Rate Limiting**
   ```javascript
   // Prevent API abuse
   app.use(rateLimit({
     windowMs: 60000,
     max: 20
   }));
   ```

### Medium-term Improvements

1. **PostgreSQL for Transcripts**
   - Persist chat history permanently
   - Enable analytics and reporting
   - User authentication integration

2. **Semantic Caching**
   - Cache similar queries, not just exact matches
   - Use embedding similarity for cache lookup

3. **Conversation Summarization**
   - Summarize long conversations
   - Reduce context window usage

### Long-term Improvements

1. **Multi-tenant Architecture**
   - Separate vector stores per organization
   - Custom news sources per tenant

2. **Fine-tuned Embeddings**
   - Train embeddings on news domain
   - Improve retrieval accuracy

3. **Hybrid Search**
   - Combine vector search with keyword search
   - Better handling of specific entity queries

4. **Evaluation Metrics**
   - Track retrieval accuracy
   - Monitor response quality
   - A/B test different prompts

---

## Summary

This RAG chatbot demonstrates:

1. **Complete RAG Pipeline**: Ingestion → Embedding → Retrieval → Generation
2. **Session Management**: Redis-based with TTL and fallback
3. **Real-time Communication**: Socket.IO with streaming responses
4. **Clean Architecture**: Modular services, separation of concerns
5. **Production-Ready Features**: Error handling, health checks, CORS

The codebase is designed to be easily extensible and can be adapted for production use with the suggested improvements.
