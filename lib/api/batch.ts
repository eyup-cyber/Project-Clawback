/**
 * Request Batching
 * Allows multiple API operations in a single request
 */

import { z } from 'zod';

export interface BatchRequest {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface BatchResponse {
  id: string;
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface BatchResult {
  responses: BatchResponse[];
  executionTime: number;
}

export const batchRequestSchema = z.object({
  requests: z.array(z.object({
    id: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    path: z.string().startsWith('/api/'),
    body: z.unknown().optional(),
    headers: z.record(z.string(), z.string()).optional(),
  })).min(1).max(20), // Limit batch size
});

export type BatchRequestInput = z.infer<typeof batchRequestSchema>;

/**
 * Execute a batch of requests
 */
export async function executeBatch(
  batch: BatchRequest[],
  baseUrl: string,
  authHeaders: Record<string, string> = {}
): Promise<BatchResult> {
  const startTime = Date.now();
  
  // Execute requests in parallel (with concurrency limit)
  const responses = await Promise.all(
    batch.map(async (request): Promise<BatchResponse> => {
      try {
        const url = new URL(request.path, baseUrl);
        
        const fetchOptions: RequestInit = {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...request.headers,
          },
        };
        
        if (request.body && request.method !== 'GET') {
          fetchOptions.body = JSON.stringify(request.body);
        }
        
        const response = await fetch(url.toString(), fetchOptions);
        const body = await response.json().catch(() => null);
        
        return {
          id: request.id,
          status: response.status,
          body,
          headers: Object.fromEntries(response.headers.entries()),
        };
      } catch (error) {
        return {
          id: request.id,
          status: 500,
          body: {
            error: {
              message: error instanceof Error ? error.message : 'Request failed',
              code: 'BATCH_REQUEST_ERROR',
            },
          },
        };
      }
    })
  );

  return {
    responses,
    executionTime: Date.now() - startTime,
  };
}

/**
 * Request coalescing for identical requests
 */
const coalescedRequests = new Map<string, Promise<unknown>>();

export async function coalesce<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: { ttlMs?: number } = {}
): Promise<T> {
  const { ttlMs = 100 } = options;
  
  // Check for existing in-flight request
  const existing = coalescedRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  // Create new request
  const promise = fetchFn().finally(() => {
    // Remove from map after TTL
    setTimeout(() => {
      coalescedRequests.delete(key);
    }, ttlMs);
  });

  coalescedRequests.set(key, promise);
  return promise;
}

/**
 * DataLoader pattern for batching database queries
 */
export class DataLoader<K, V> {
  private batch: Map<K, { resolve: (value: V | undefined) => void; reject: (error: Error) => void }[]> = new Map();
  private scheduled = false;
  private batchFn: (keys: K[]) => Promise<Map<K, V>>;
  private options: { maxBatchSize?: number; batchScheduleFn?: (callback: () => void) => void };

  constructor(
    batchFn: (keys: K[]) => Promise<Map<K, V>>,
    options: { maxBatchSize?: number; batchScheduleFn?: (callback: () => void) => void } = {}
  ) {
    this.batchFn = batchFn;
    this.options = {
      maxBatchSize: 100,
      batchScheduleFn: (callback) => process.nextTick(callback),
      ...options,
    };
  }

  async load(key: K): Promise<V | undefined> {
    return new Promise((resolve, reject) => {
      const callbacks = this.batch.get(key) || [];
      callbacks.push({ resolve, reject });
      this.batch.set(key, callbacks);

      if (!this.scheduled) {
        this.scheduled = true;
        this.options.batchScheduleFn!(() => this.dispatchBatch());
      }
    });
  }

  async loadMany(keys: K[]): Promise<(V | undefined)[]> {
    return Promise.all(keys.map((key) => this.load(key)));
  }

  private async dispatchBatch(): Promise<void> {
    const batch = this.batch;
    this.batch = new Map();
    this.scheduled = false;

    if (batch.size === 0) return;

    const keys = Array.from(batch.keys());
    
    try {
      const results = await this.batchFn(keys);
      
      for (const [key, callbacks] of batch) {
        const value = results.get(key);
        for (const { resolve } of callbacks) {
          resolve(value);
        }
      }
    } catch (error) {
      for (const callbacks of batch.values()) {
        for (const { reject } of callbacks) {
          reject(error instanceof Error ? error : new Error('Batch load failed'));
        }
      }
    }
  }

  clear(key: K): void {
    this.batch.delete(key);
  }

  clearAll(): void {
    this.batch.clear();
  }
}

/**
 * Create a DataLoader for database entities
 */
export function createEntityLoader<T extends { id: string }>(
  fetchByIds: (ids: string[]) => Promise<T[]>
): DataLoader<string, T> {
  return new DataLoader(async (ids: string[]) => {
    const entities = await fetchByIds(ids);
    const map = new Map<string, T>();
    for (const entity of entities) {
      map.set(entity.id, entity);
    }
    return map;
  });
}

/**
 * Batch multiple database operations
 */
export async function batchDatabaseOperations<T>(
  operations: Array<() => Promise<T>>
): Promise<PromiseSettledResult<T>[]> {
  // Execute with concurrency limit
  const CONCURRENCY = 10;
  const results: PromiseSettledResult<T>[] = [];
  
  for (let i = 0; i < operations.length; i += CONCURRENCY) {
    const batch = operations.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(batch.map((op) => op()));
    results.push(...batchResults);
  }
  
  return results;
}
