const vectorStore = require('./vectorStore');
const geminiService = require('./gemini');
const sessionService = require('./session');
const config = require('../config');

class RAGService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize the RAG service
   */
  async initialize() {
    await vectorStore.initialize();
    this.isInitialized = true;
    console.log('✅ RAG Service initialized');
  }

  /**
   * Process a user query through the RAG pipeline
   * @param {string} sessionId - User's session ID
   * @param {string} query - User's question
   * @returns {Promise<{answer: string, sources: Array}>}
   */
  async processQuery(sessionId, query) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Validate session
    const isValid = await sessionService.validateSession(sessionId);
    if (!isValid) {
      throw new Error('Invalid or expired session');
    }

    // Get chat history for context
    const history = await sessionService.getHistory(sessionId, 10);

    // Retrieve relevant passages from vector store
    const relevantDocs = await vectorStore.search(query, config.rag.topK);
    
    if (relevantDocs.length === 0) {
      const noDocsResponse = "I don't have any news articles to search through yet. Please make sure the news corpus has been ingested.";
      await sessionService.addMessage(sessionId, 'user', query);
      await sessionService.addMessage(sessionId, 'assistant', noDocsResponse);
      return {
        answer: noDocsResponse,
        sources: [],
      };
    }

    // Save user message
    await sessionService.addMessage(sessionId, 'user', query);

    // Generate response using Gemini
    const answer = await geminiService.generateResponse(
      query,
      relevantDocs,
      history.map(m => ({ role: m.role, content: m.content }))
    );

    // Save assistant response
    await sessionService.addMessage(sessionId, 'assistant', answer);

    return {
      answer,
      sources: relevantDocs.map(doc => ({
        text: doc.text.substring(0, 200) + '...',
        score: doc.score.toFixed(4),
        metadata: doc.metadata,
      })),
    };
  }

  /**
   * Process query with streaming response
   * @param {string} sessionId - User's session ID
   * @param {string} query - User's question
   * @param {function} onChunk - Callback for each response chunk
   * @returns {Promise<{answer: string, sources: Array}>}
   */
  async processQueryStream(sessionId, query, onChunk) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Validate session
    const isValid = await sessionService.validateSession(sessionId);
    if (!isValid) {
      throw new Error('Invalid or expired session');
    }

    // Get chat history for context
    const history = await sessionService.getHistory(sessionId, 10);

    // Retrieve relevant passages from vector store
    const relevantDocs = await vectorStore.search(query, config.rag.topK);
    
    if (relevantDocs.length === 0) {
      const noDocsResponse = "I don't have any news articles to search through yet. Please make sure the news corpus has been ingested.";
      await sessionService.addMessage(sessionId, 'user', query);
      await sessionService.addMessage(sessionId, 'assistant', noDocsResponse);
      onChunk(noDocsResponse);
      return {
        answer: noDocsResponse,
        sources: [],
      };
    }

    // Save user message
    await sessionService.addMessage(sessionId, 'user', query);

    // Generate streaming response using Gemini
    const answer = await geminiService.streamResponse(
      query,
      relevantDocs,
      history.map(m => ({ role: m.role, content: m.content })),
      onChunk
    );

    // Save assistant response
    await sessionService.addMessage(sessionId, 'assistant', answer);

    return {
      answer,
      sources: relevantDocs.map(doc => ({
        text: doc.text.substring(0, 200) + '...',
        score: doc.score.toFixed(4),
        metadata: doc.metadata,
      })),
    };
  }

  /**
   * Get the number of indexed documents
   */
  getDocumentCount() {
    return vectorStore.getDocumentCount();
  }
}

module.exports = new RAGService();
