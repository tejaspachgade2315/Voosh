const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    // Use gemini-2.0-flash which is the current available model
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  /**
   * Generate a response using RAG context
   * @param {string} query - User's question
   * @param {Array<{text: string, metadata: object}>} context - Retrieved passages
   * @param {Array<{role: string, content: string}>} chatHistory - Previous messages
   * @returns {Promise<string>} Generated response
   */
  async generateResponse(query, context, chatHistory = []) {
    const contextText = context
      .map((doc, idx) => `[Source ${idx + 1}]: ${doc.text}`)
      .join('\n\n');

    const systemPrompt = `You are a helpful news assistant chatbot. Your role is to answer questions about recent news articles based on the provided context.

IMPORTANT GUIDELINES:
1. Only answer based on the provided news context
2. If the context doesn't contain relevant information, say so politely
3. Cite sources when possible (e.g., "According to Source 1...")
4. Keep responses concise but informative
5. If asked about topics not in the news context, explain that you can only answer questions about the available news articles
6. Be conversational and helpful

NEWS CONTEXT:
${contextText}`;

    // Build conversation history for the model
    const contents = [];
    
    // Add system context as first user message
    contents.push({
      role: 'user',
      parts: [{ text: systemPrompt }],
    });
    
    contents.push({
      role: 'model',
      parts: [{ text: 'I understand. I\'m ready to answer questions about the news articles you\'ve provided. How can I help you?' }],
    });

    // Add chat history
    for (const msg of chatHistory.slice(-10)) { // Last 10 messages for context
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }

    // Add current query
    contents.push({
      role: 'user',
      parts: [{ text: query }],
    });

    try {
      const result = await this.model.generateContent({ contents });
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error('Failed to generate response from Gemini API');
    }
  }

  /**
   * Stream response for real-time output
   * @param {string} query - User's question
   * @param {Array<{text: string, metadata: object}>} context - Retrieved passages
   * @param {Array<{role: string, content: string}>} chatHistory - Previous messages
   * @param {function} onChunk - Callback for each chunk
   * @returns {Promise<string>} Full generated response
   */
  async streamResponse(query, context, chatHistory = [], onChunk) {
    const contextText = context
      .map((doc, idx) => `[Source ${idx + 1}]: ${doc.text}`)
      .join('\n\n');

    const systemPrompt = `You are a helpful news assistant chatbot. Your role is to answer questions about recent news articles based on the provided context.

IMPORTANT GUIDELINES:
1. Only answer based on the provided news context
2. If the context doesn't contain relevant information, say so politely
3. Cite sources when possible (e.g., "According to Source 1...")
4. Keep responses concise but informative
5. If asked about topics not in the news context, explain that you can only answer questions about the available news articles
6. Be conversational and helpful

NEWS CONTEXT:
${contextText}`;

    const contents = [];
    
    contents.push({
      role: 'user',
      parts: [{ text: systemPrompt }],
    });
    
    contents.push({
      role: 'model',
      parts: [{ text: 'I understand. I\'m ready to answer questions about the news articles you\'ve provided. How can I help you?' }],
    });

    for (const msg of chatHistory.slice(-10)) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: query }],
    });

    try {
      const result = await this.model.generateContentStream({ contents });
      
      let fullResponse = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        if (onChunk) {
          onChunk(chunkText);
        }
      }
      
      return fullResponse;
    } catch (error) {
      console.error('Gemini streaming error:', error.message);
      
      // Handle rate limiting
      if (error.status === 429) {
        const fallbackResponse = `I apologize, but the AI service is currently experiencing high demand. Here's what I found in the news:\n\n${context.slice(0, 3).map((doc, i) => `**Source ${i + 1}**: ${doc.text.substring(0, 300)}...`).join('\n\n')}\n\nPlease try again in a few moments for a more detailed response.`;
        if (onChunk) {
          onChunk(fallbackResponse);
        }
        return fallbackResponse;
      }
      
      throw new Error('Failed to stream response from Gemini API');
    }
  }
}

module.exports = new GeminiService();
