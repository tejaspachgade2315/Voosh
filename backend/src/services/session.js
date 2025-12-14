const { v4: uuidv4 } = require('uuid');
const redisClient = require('./redis');
const config = require('../config');

class SessionService {
  constructor() {
    this.sessionPrefix = 'session:';
    this.historyPrefix = 'history:';
  }

  /**
   * Create a new session
   * @returns {Promise<{sessionId: string, createdAt: string}>}
   */
  async createSession() {
    const sessionId = uuidv4();
    const redis = redisClient.getClient();
    
    const sessionData = {
      id: sessionId,
      createdAt: new Date().toISOString(),
      messageCount: 0,
    };
    
    await redis.setex(
      `${this.sessionPrefix}${sessionId}`,
      config.sessionTTL,
      JSON.stringify(sessionData)
    );
    
    console.log(`📝 Created session: ${sessionId}`);
    return sessionData;
  }

  /**
   * Get session data
   * @param {string} sessionId
   * @returns {Promise<object|null>}
   */
  async getSession(sessionId) {
    const redis = redisClient.getClient();
    const data = await redis.get(`${this.sessionPrefix}${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Validate and refresh session
   * @param {string} sessionId
   * @returns {Promise<boolean>}
   */
  async validateSession(sessionId) {
    const redis = redisClient.getClient();
    const exists = await redis.exists(`${this.sessionPrefix}${sessionId}`);
    
    if (exists) {
      // Refresh TTL on activity
      await redis.expire(`${this.sessionPrefix}${sessionId}`, config.sessionTTL);
      await redis.expire(`${this.historyPrefix}${sessionId}`, config.sessionTTL);
      return true;
    }
    
    return false;
  }

  /**
   * Add message to session history
   * @param {string} sessionId
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   */
  async addMessage(sessionId, role, content) {
    const redis = redisClient.getClient();
    
    const message = {
      id: uuidv4(),
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    
    await redis.rpush(
      `${this.historyPrefix}${sessionId}`,
      JSON.stringify(message)
    );
    
    // Update message count in session
    const sessionData = await this.getSession(sessionId);
    if (sessionData) {
      sessionData.messageCount = (sessionData.messageCount || 0) + 1;
      await redis.setex(
        `${this.sessionPrefix}${sessionId}`,
        config.sessionTTL,
        JSON.stringify(sessionData)
      );
    }
    
    // Refresh TTL
    await redis.expire(`${this.historyPrefix}${sessionId}`, config.sessionTTL);
    
    return message;
  }

  /**
   * Get chat history for a session
   * @param {string} sessionId
   * @param {number} limit - Maximum number of messages to return
   * @returns {Promise<Array<{role: string, content: string, timestamp: string}>>}
   */
  async getHistory(sessionId, limit = 100) {
    const redis = redisClient.getClient();
    const messages = await redis.lrange(
      `${this.historyPrefix}${sessionId}`,
      -limit,
      -1
    );
    
    return messages.map(msg => JSON.parse(msg));
  }

  /**
   * Clear session history
   * @param {string} sessionId
   */
  async clearHistory(sessionId) {
    const redis = redisClient.getClient();
    await redis.del(`${this.historyPrefix}${sessionId}`);
    
    // Reset message count
    const sessionData = await this.getSession(sessionId);
    if (sessionData) {
      sessionData.messageCount = 0;
      await redis.setex(
        `${this.sessionPrefix}${sessionId}`,
        config.sessionTTL,
        JSON.stringify(sessionData)
      );
    }
    
    console.log(`🗑️ Cleared history for session: ${sessionId}`);
  }

  /**
   * Delete session completely
   * @param {string} sessionId
   */
  async deleteSession(sessionId) {
    const redis = redisClient.getClient();
    await redis.del(`${this.sessionPrefix}${sessionId}`);
    await redis.del(`${this.historyPrefix}${sessionId}`);
    console.log(`🗑️ Deleted session: ${sessionId}`);
  }

  /**
   * Get all active sessions (for admin purposes)
   * @returns {Promise<string[]>}
   */
  async getAllSessions() {
    const redis = redisClient.getClient();
    const keys = await redis.keys(`${this.sessionPrefix}*`);
    return keys.map(key => key.replace(this.sessionPrefix, ''));
  }
}

module.exports = new SessionService();
