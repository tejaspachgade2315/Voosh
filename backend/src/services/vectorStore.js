const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const embeddingService = require('./embedding');

class VectorStore {
  constructor() {
    this.documents = [];
    this.embeddings = [];
    this.metadata = [];
    this.storePath = config.vectorStorePath;
    this.isLoaded = false;
  }

  /**
   * Initialize the vector store
   */
  async initialize() {
    try {
      await this.load();
      this.isLoaded = true;
      console.log(`✅ Vector store loaded with ${this.documents.length} documents`);
    } catch (error) {
      console.log('📝 Creating new vector store...');
      this.isLoaded = true;
    }
  }

  /**
   * Add documents to the vector store
   * @param {Array<{text: string, metadata: object}>} docs - Documents to add
   */
  async addDocuments(docs) {
    const texts = docs.map(d => d.text);
    const embeddings = await embeddingService.generateEmbeddings(texts);
    
    for (let i = 0; i < docs.length; i++) {
      this.documents.push(docs[i].text);
      this.embeddings.push(embeddings[i]);
      this.metadata.push(docs[i].metadata || {});
    }
    
    await this.save();
    console.log(`✅ Added ${docs.length} documents to vector store`);
  }

  /**
   * Search for similar documents
   * @param {string} query - Query text
   * @param {number} topK - Number of results to return
   * @returns {Promise<Array<{text: string, score: number, metadata: object}>>}
   */
  async search(query, topK = config.rag.topK) {
    if (this.documents.length === 0) {
      return [];
    }

    const [queryEmbedding] = await embeddingService.generateEmbeddings(query);
    
    // Calculate similarities
    const similarities = this.embeddings.map((embedding, index) => ({
      index,
      score: embeddingService.cosineSimilarity(queryEmbedding, embedding),
    }));

    // Sort by similarity and get top-k
    similarities.sort((a, b) => b.score - a.score);
    const topResults = similarities.slice(0, topK);

    return topResults.map(result => ({
      text: this.documents[result.index],
      score: result.score,
      metadata: this.metadata[result.index],
    }));
  }

  /**
   * Save vector store to disk
   */
  async save() {
    try {
      await fs.mkdir(this.storePath, { recursive: true });
      
      const data = {
        documents: this.documents,
        embeddings: this.embeddings,
        metadata: this.metadata,
        timestamp: new Date().toISOString(),
      };
      
      const filePath = path.join(this.storePath, 'index.json');
      await fs.writeFile(filePath, JSON.stringify(data));
      console.log(`💾 Vector store saved to ${filePath}`);
    } catch (error) {
      console.error('Error saving vector store:', error);
      throw error;
    }
  }

  /**
   * Load vector store from disk
   */
  async load() {
    const filePath = path.join(this.storePath, 'index.json');
    const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    
    this.documents = data.documents || [];
    this.embeddings = data.embeddings || [];
    this.metadata = data.metadata || [];
    
    return data;
  }

  /**
   * Clear all documents from the vector store
   */
  async clear() {
    this.documents = [];
    this.embeddings = [];
    this.metadata = [];
    await this.save();
    console.log('🗑️ Vector store cleared');
  }

  /**
   * Get document count
   */
  getDocumentCount() {
    return this.documents.length;
  }
}

module.exports = new VectorStore();
