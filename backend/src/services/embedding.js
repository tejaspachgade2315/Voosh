const axios = require('axios');
const config = require('../config');

class EmbeddingService {
  constructor() {
    this.jinaApiKey = config.jinaApiKey;
    this.baseUrl = 'https://api.jina.ai/v1/embeddings';
  }

  /**
   * Generate embeddings for text using Jina AI
   * @param {string|string[]} texts - Text or array of texts to embed
   * @returns {Promise<number[][]>} Array of embedding vectors
   */
  async generateEmbeddings(texts) {
    const textArray = Array.isArray(texts) ? texts : [texts];
    
    try {
      // Use Jina AI Embeddings API
      if (this.jinaApiKey && this.jinaApiKey !== 'your_jina_api_key_here') {
        return await this._jinaEmbed(textArray);
      }
      
      // Fallback to simple local embeddings for development
      console.log('⚠️ Using local embeddings (set JINA_API_KEY for production)');
      return this._localEmbed(textArray);
    } catch (error) {
      console.error('Embedding error, falling back to local:', error.message);
      return this._localEmbed(textArray);
    }
  }

  /**
   * Generate embeddings using Jina AI API
   */
  async _jinaEmbed(texts) {
    const response = await axios.post(
      this.baseUrl,
      {
        input: texts,
        model: 'jina-embeddings-v3',
      },
      {
        headers: {
          'Authorization': `Bearer ${this.jinaApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.data.map(item => item.embedding);
  }

  /**
   * Simple local embedding fallback using TF-IDF-like approach
   * This is for development/testing only
   */
  _localEmbed(texts) {
    const DIMENSION = 384; // Standard embedding dimension
    
    return texts.map(text => {
      const words = text.toLowerCase().split(/\s+/);
      const embedding = new Array(DIMENSION).fill(0);
      
      words.forEach((word, idx) => {
        const hash = this._simpleHash(word);
        const position = Math.abs(hash) % DIMENSION;
        embedding[position] += 1 / Math.sqrt(words.length);
        
        // Add some positional information
        const posHash = (hash + idx) % DIMENSION;
        embedding[posHash] += 0.1 / Math.sqrt(words.length);
      });
      
      // Normalize the vector
      const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      return embedding.map(val => norm > 0 ? val / norm : 0);
    });
  }

  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}

module.exports = new EmbeddingService();
