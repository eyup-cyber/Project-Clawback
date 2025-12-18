/**
 * Test setup and utilities
 * Provides mocks and test helpers
 */

// Ensure this file is treated as a module
export {};

// Extend global namespace for test utilities
declare global {
  function createMockRequest(overrides?: Record<string, unknown>): Record<string, unknown>;
  function createMockResponse(data: unknown, status?: number): Record<string, unknown>;
}

// Mock environment variables
// @ts-expect-error - NODE_ENV is read-only in TypeScript but can be set in Jest
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

// Mock isomorphic-dompurify with basic sanitization for testing
jest.mock('isomorphic-dompurify', () => {
  interface SanitizeOptions {
    ALLOWED_TAGS?: string[];
    KEEP_CONTENT?: boolean;
  }

  // Basic sanitization that mimics DOMPurify behavior for testing
  const sanitize = (dirty: string, options?: SanitizeOptions): string => {
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

  return {
    __esModule: true,
    default: {
      sanitize: jest.fn(sanitize),
    },
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

    static redirect(url: string, status = 302) {
      const response = new MockNextResponse(null, { status });
      response.headers.set('Location', url);
      return response;
    }
  }

  return {
    NextRequest: jest.fn().mockImplementation((url: string, init?: RequestInit) => ({
      url,
      method: init?.method || 'GET',
      headers: new Headers(init?.headers),
      json: jest.fn().mockResolvedValue(init?.body ? JSON.parse(init.body as string) : {}),
    })),
    NextResponse: MockNextResponse,
  };
});

// Global test utilities
(
  globalThis as typeof globalThis & { createMockRequest: typeof createMockRequest }
).createMockRequest = createMockRequest;
(
  globalThis as typeof globalThis & { createMockResponse: typeof createMockResponse }
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
