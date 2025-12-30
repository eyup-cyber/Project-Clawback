/**
 * Test setup and utilities
 * Provides mocks and test helpers
 */

import { type createChainableMock, createMockSupabaseClient } from './mocks';

// Extend global namespace for test utilities
declare global {
  function createMockRequest(overrides?: Record<string, unknown>): Record<string, unknown>;
  function createMockResponse(data: unknown, status?: number): Record<string, unknown>;

  var __mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

  var __mockSupabaseQuery: ReturnType<typeof createChainableMock>;
}

// Mock environment variables
// @ts-expect-error - NODE_ENV is read-only in TypeScript but can be set in Jest
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

// Mock Supabase server client globally - createClient is ASYNC
// Note: Use a getter function because jest.mock is hoisted before variable assignments
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => {
    // Access the global mock lazily to avoid hoisting issues
    return globalThis.__mockSupabaseClient;
  }),
  createServiceClient: jest.fn(async () => {
    return globalThis.__mockSupabaseClient;
  }),
}));

// Create global mock Supabase client that tests can access
// This must happen after imports but the mock above accesses it lazily
globalThis.__mockSupabaseClient = createMockSupabaseClient();
globalThis.__mockSupabaseQuery = globalThis.__mockSupabaseClient._query;

// Mock isomorphic-dompurify with basic sanitization for testing
jest.mock('isomorphic-dompurify', () => {
  interface SanitizeOptions {
    ALLOWED_TAGS?: string[];
    KEEP_CONTENT?: boolean;
  }

  // Basic sanitization that mimics DOMPurify behavior for testing
  const sanitizeImpl = (dirty: string, options?: SanitizeOptions): string => {
    if (!dirty) return '';

    // If ALLOWED_TAGS is empty array, strip ALL HTML tags but keep text content
    if (options?.ALLOWED_TAGS?.length === 0 && options?.KEEP_CONTENT) {
      return dirty.replace(/<[^>]*>/g, '');
    }

    // Default sanitization - remove dangerous content but keep safe tags
    return (
      dirty
        // Remove script tags and content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove event handlers
        .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
        // Remove javascript: URLs
        .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '')
        // Remove data: URLs in src attributes
        .replace(/src\s*=\s*["']data:[^"']*["']/gi, '')
    );
  };

  // Create the mock object with sanitize method
  const mockDOMPurify = {
    sanitize: sanitizeImpl,
  };

  return {
    __esModule: true,
    default: mockDOMPurify,
  };
});

// Suppress console logs in tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Mock Next.js
jest.mock('next/server', () => {
  // NextResponse mock that works as both constructor and static methods
  class MockNextResponse {
    body: unknown;
    status: number;
    headers: Headers;

    constructor(body: unknown, init?: { status?: number; headers?: HeadersInit }) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Headers(init?.headers);
    }

    async json() {
      return this.body;
    }

    static json(data: unknown, init?: { status?: number; headers?: HeadersInit }) {
      const response = new MockNextResponse(data, init);
      return response;
    }

    static redirect(url: string, status = 307) {
      const response = new MockNextResponse(null, { status });
      response.headers.set('Location', url);
      return response;
    }
  }

  // NextRequest mock that properly handles URL parsing
  class MockNextRequest {
    url: string;
    method: string;
    headers: Headers;
    private _body: unknown;
    nextUrl: URL;

    constructor(url: string, init?: RequestInit) {
      this.url = url;
      this.method = init?.method || 'GET';
      this.headers = new Headers(init?.headers);
      this._body = init?.body;
      this.nextUrl = new URL(url);
    }

    async json() {
      if (typeof this._body === 'string') {
        return JSON.parse(this._body);
      }
      return this._body || {};
    }

    async text() {
      return typeof this._body === 'string' ? this._body : JSON.stringify(this._body || {});
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});

// Global test utilities
(
  globalThis as typeof globalThis & {
    createMockRequest: typeof createMockRequest;
  }
).createMockRequest = createMockRequest;
(
  globalThis as typeof globalThis & {
    createMockResponse: typeof createMockResponse;
  }
).createMockResponse = createMockResponse;

function createMockRequest(overrides: Record<string, unknown> = {}) {
  return {
    method: 'GET',
    url: 'http://localhost:3000/api/test',
    headers: new Headers({
      'content-type': 'application/json',
      ...((overrides.headers as Record<string, string>) || {}),
    }),
    json: jest.fn(),
    ...overrides,
  };
}

function createMockResponse(data: unknown, status = 200) {
  return {
    json: async () => data,
    status,
    headers: new Headers(),
  };
}
