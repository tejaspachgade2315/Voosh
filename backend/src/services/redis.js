const Redis = require('ioredis');
const config = require('../config');

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    // Check if we should skip Redis (for development without Redis)
    if (!config.redisUrl || config.redisUrl === 'redis://localhost:6379') {
      // Try to connect but fall back silently
      try {
        this.client = new Redis(config.redisUrl, {
          maxRetriesPerRequest: 1,
          retryStrategy: () => null, // Don't retry
          enableReadyCheck: true,
          lazyConnect: true,
          connectTimeout: 2000,
        });

        await this.client.connect();
        this.isConnected = true;
        console.log('✅ Connected to Redis');
        
        this.client.on('error', () => {
          // Silently ignore connection errors after initial failure
        });

        return this.client;
      } catch (error) {
        console.log('📦 Using in-memory store (Redis not available)');
        this.client = new InMemoryStore();
        this.isConnected = true;
        return this.client;
      }
    }

    try {
      this.client = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      await this.client.connect();
      this.isConnected = true;
      console.log('✅ Connected to Redis');
      
      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('Reconnecting to Redis...');
      });

      return this.client;
    } catch (error) {
      console.warn('⚠️ Redis connection failed, using in-memory fallback:', error.message);
      this.client = new InMemoryStore();
      this.isConnected = true;
      return this.client;
    }
  }

  getClient() {
    if (!this.client) {
      throw new Error('Redis client not initialized. Call connect() first.');
    }
    return this.client;
  }

  async disconnect() {
    if (this.client && this.client.quit) {
      await this.client.quit();
      this.isConnected = false;
      console.log('Disconnected from Redis');
    }
  }
}

// In-memory fallback for development without Redis
class InMemoryStore {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
    console.log('📦 Using in-memory store as Redis fallback');
  }

  async get(key) {
    this._checkExpiry(key);
    const value = this.store.get(key);
    return value || null;
  }

  async set(key, value, ...args) {
    this.store.set(key, value);
    
    // Handle EX option for TTL
    const exIndex = args.indexOf('EX');
    if (exIndex !== -1 && args[exIndex + 1]) {
      const ttl = parseInt(args[exIndex + 1]) * 1000;
      this.ttls.set(key, Date.now() + ttl);
    }
    return 'OK';
  }

  async setex(key, seconds, value) {
    this.store.set(key, value);
    this.ttls.set(key, Date.now() + seconds * 1000);
    return 'OK';
  }

  async del(key) {
    this.store.delete(key);
    this.ttls.delete(key);
    return 1;
  }

  async lpush(key, ...values) {
    const list = this.store.get(key) || [];
    list.unshift(...values);
    this.store.set(key, list);
    return list.length;
  }

  async rpush(key, ...values) {
    const list = this.store.get(key) || [];
    list.push(...values);
    this.store.set(key, list);
    return list.length;
  }

  async lrange(key, start, stop) {
    this._checkExpiry(key);
    const list = this.store.get(key) || [];
    const end = stop === -1 ? list.length : stop + 1;
    return list.slice(start, end);
  }

  async ltrim(key, start, stop) {
    const list = this.store.get(key) || [];
    const end = stop === -1 ? list.length : stop + 1;
    this.store.set(key, list.slice(start, end));
    return 'OK';
  }

  async expire(key, seconds) {
    if (this.store.has(key)) {
      this.ttls.set(key, Date.now() + seconds * 1000);
      return 1;
    }
    return 0;
  }

  async exists(key) {
    this._checkExpiry(key);
    return this.store.has(key) ? 1 : 0;
  }

  async keys(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(this.store.keys()).filter(key => regex.test(key));
  }

  _checkExpiry(key) {
    const expiry = this.ttls.get(key);
    if (expiry && Date.now() > expiry) {
      this.store.delete(key);
      this.ttls.delete(key);
    }
  }

  async quit() {
    this.store.clear();
    this.ttls.clear();
    return 'OK';
  }
}

const redisClient = new RedisClient();

module.exports = redisClient;
