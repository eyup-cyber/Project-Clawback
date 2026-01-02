/**
 * Request context tracking for structured logging
 * Provides request ID correlation and context propagation
 */
import { AsyncLocalStorage } from 'async_hooks';

let requestIdCounter = 0;

export interface RequestContext {
  requestId: string;
  method: string;
  path: string;
  ip?: string;
  userAgent?: string;
  userId?: string;
  startTime: number;
  [key: string]: unknown;
}

// AsyncLocalStorage ensures propagation across async boundaries
const asyncContext = new AsyncLocalStorage<RequestContext>();
// Map fallback for lookups by requestId (for explicit logging calls)
const contextStore = new Map<string, RequestContext>();

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  requestIdCounter += 1;
  return `req_${Date.now()}_${requestIdCounter.toString(36)}`;
}

/**
 * Create a new request context and set it for the current async scope.
 */
export function createContext(
  requestId: string,
  method: string,
  path: string,
  options?: {
    ip?: string;
    userAgent?: string;
    userId?: string;
  }
): RequestContext {
  const context: RequestContext = {
    requestId,
    method,
    path,
    startTime: Date.now(),
    ...options,
  };

  contextStore.set(requestId, context);
  // Bind to current async execution
  asyncContext.enterWith(context);
  return context;
}

/**
 * Get request context by ID or from the current async scope.
 */
export function getContext(requestId?: string): RequestContext | undefined {
  if (requestId && contextStore.has(requestId)) {
    return contextStore.get(requestId);
  }
  return asyncContext.getStore() ?? undefined;
}

/**
 * Update context with additional data.
 */
export function updateContext(requestId: string, data: Partial<RequestContext>): void {
  const context = contextStore.get(requestId) || asyncContext.getStore();
  if (context) {
    Object.assign(context, data);
    if (contextStore.has(context.requestId)) {
      contextStore.set(context.requestId, context);
    }
  }
}

/**
 * Clear context (call after request completes)
 */
export function clearContext(requestId: string): void {
  contextStore.delete(requestId);
}

/**
 * Clean up old contexts (call periodically)
 */
export function cleanupContexts(maxAge: number = 300000): void {
  const now = Date.now();
  for (const [id, context] of contextStore.entries()) {
    if (now - context.startTime > maxAge) {
      contextStore.delete(id);
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => cleanupContexts(), 300000);
}
