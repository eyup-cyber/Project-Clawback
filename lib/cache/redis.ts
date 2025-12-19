/**
 * Redis Client with Connection Pooling
 * Provides a robust Redis client for caching with automatic reconnection
 */

import Redis, { type RedisOptions } from 'ioredis';

// Redis configuration
const REDIS_CONFIG: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  
  // Connection pooling
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    // Exponential backoff with max 30 seconds
    const delay = Math.min(times * 500, 30000);
    return delay;
  },
  
  // Reconnect on error
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
  
  // Timeouts
  connectTimeout: 10000,
  commandTimeout: 5000,
  
  // Keep alive
  keepAlive: 30000,
  
  // Enable offline queue
  enableOfflineQueue: true,
  
  // TLS for production
  ...(process.env.REDIS_TLS === 'true' && {
    tls: {
      rejectUnauthorized: false,
    },
  }),
};

// Singleton instance
let redisClient: Redis | null = null;
let isConnected = false;

/**
 * Get or create Redis client
 */
export function getRedisClient(): Redis | null {
  // Skip Redis in test environment
  if (process.env.NODE_ENV === 'test') {
    return null;
  }
  
  // Skip if Redis is not configured
  if (!process.env.REDIS_HOST && process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(REDIS_CONFIG);

    redisClient.on('connect', () => {
      console.log('Redis connected');
      isConnected = true;
    });

    redisClient.on('ready', () => {
      console.log('Redis ready');
    });

    redisClient.on('error', (err) => {
      console.error('Redis error:', err.message);
      isConnected = false;
    });

    redisClient.on('close', () => {
      console.log('Redis connection closed');
      isConnected = false;
    });

    redisClient.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });
  }

  return redisClient;
}

/**
 * Check if Redis is connected
 */
export function isRedisConnected(): boolean {
  return isConnected && redisClient?.status === 'ready';
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
  }
}

/**
 * Redis cache operations
 */
export const redis = {
  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    if (!client) return null;

    try {
      const value = await client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  },

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await client.setex(key, ttlSeconds, serialized);
      } else {
        await client.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  },

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Redis del error:', error);
      return false;
    }
  },

  /**
   * Delete keys matching a pattern
   */
  async delPattern(pattern: string): Promise<number> {
    const client = getRedisClient();
    if (!client) return 0;

    try {
      const keys = await client.keys(pattern);
      if (keys.length === 0) return 0;
      const deleted = await client.del(...keys);
      return deleted;
    } catch (error) {
      console.error('Redis delPattern error:', error);
      return 0;
    }
  },

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  },

  /**
   * Set expiration on a key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      await client.expire(key, ttlSeconds);
      return true;
    } catch (error) {
      console.error('Redis expire error:', error);
      return false;
    }
  },

  /**
   * Get time to live for a key
   */
  async ttl(key: string): Promise<number> {
    const client = getRedisClient();
    if (!client) return -2;

    try {
      return await client.ttl(key);
    } catch (error) {
      console.error('Redis ttl error:', error);
      return -2;
    }
  },

  /**
   * Increment a numeric value
   */
  async incr(key: string): Promise<number> {
    const client = getRedisClient();
    if (!client) return 0;

    try {
      return await client.incr(key);
    } catch (error) {
      console.error('Redis incr error:', error);
      return 0;
    }
  },

  /**
   * Hash operations
   */
  hash: {
    async get<T>(key: string, field: string): Promise<T | null> {
      const client = getRedisClient();
      if (!client) return null;

      try {
        const value = await client.hget(key, field);
        if (!value) return null;
        return JSON.parse(value) as T;
      } catch (error) {
        console.error('Redis hget error:', error);
        return null;
      }
    },

    async set<T>(key: string, field: string, value: T): Promise<boolean> {
      const client = getRedisClient();
      if (!client) return false;

      try {
        await client.hset(key, field, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error('Redis hset error:', error);
        return false;
      }
    },

    async getAll<T>(key: string): Promise<Record<string, T> | null> {
      const client = getRedisClient();
      if (!client) return null;

      try {
        const data = await client.hgetall(key);
        if (!data || Object.keys(data).length === 0) return null;
        
        const result: Record<string, T> = {};
        for (const [field, value] of Object.entries(data)) {
          result[field] = JSON.parse(value) as T;
        }
        return result;
      } catch (error) {
        console.error('Redis hgetall error:', error);
        return null;
      }
    },

    async del(key: string, field: string): Promise<boolean> {
      const client = getRedisClient();
      if (!client) return false;

      try {
        await client.hdel(key, field);
        return true;
      } catch (error) {
        console.error('Redis hdel error:', error);
        return false;
      }
    },
  },

  /**
   * List operations
   */
  list: {
    async push<T>(key: string, ...values: T[]): Promise<number> {
      const client = getRedisClient();
      if (!client) return 0;

      try {
        const serialized = values.map((v) => JSON.stringify(v));
        return await client.rpush(key, ...serialized);
      } catch (error) {
        console.error('Redis rpush error:', error);
        return 0;
      }
    },

    async range<T>(key: string, start: number, stop: number): Promise<T[]> {
      const client = getRedisClient();
      if (!client) return [];

      try {
        const values = await client.lrange(key, start, stop);
        return values.map((v) => JSON.parse(v) as T);
      } catch (error) {
        console.error('Redis lrange error:', error);
        return [];
      }
    },

    async length(key: string): Promise<number> {
      const client = getRedisClient();
      if (!client) return 0;

      try {
        return await client.llen(key);
      } catch (error) {
        console.error('Redis llen error:', error);
        return 0;
      }
    },
  },

  /**
   * Set operations (Redis SET data structure)
   */
  sets: {
    async add(key: string, ...members: string[]): Promise<number> {
      const client = getRedisClient();
      if (!client) return 0;

      try {
        return await client.sadd(key, ...members);
      } catch (error) {
        console.error('Redis sadd error:', error);
        return 0;
      }
    },

    async members(key: string): Promise<string[]> {
      const client = getRedisClient();
      if (!client) return [];

      try {
        return await client.smembers(key);
      } catch (error) {
        console.error('Redis smembers error:', error);
        return [];
      }
    },

    async isMember(key: string, member: string): Promise<boolean> {
      const client = getRedisClient();
      if (!client) return false;

      try {
        return (await client.sismember(key, member)) === 1;
      } catch (error) {
        console.error('Redis sismember error:', error);
        return false;
      }
    },
  },
};

export default redis;
