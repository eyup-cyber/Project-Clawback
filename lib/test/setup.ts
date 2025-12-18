/**
 * Test setup and utilities
 * Provides mocks and test helpers
 */

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

// Mock isomorphic-dompurify to avoid ESM issues with parse5/jsdom
jest.mock('isomorphic-dompurify', () => {
  return {
    __esModule: true,
    default: {
      sanitize: jest.fn((dirty: string) => dirty),
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
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
      headers: new Headers(init?.headers),
    })),
    redirect: jest.fn((url) => ({
      url,
      status: 302,
    })),
  },
}));

// Global test utilities
global.createMockRequest = (overrides = {}) => ({
  method: 'GET',
  url: 'http://localhost:3000/api/test',
  headers: new Headers({
    'content-type': 'application/json',
    ...overrides.headers,
  }),
  json: jest.fn(),
  ...overrides,
});

global.createMockResponse = (data, status = 200) => ({
  json: async () => data,
  status,
  headers: new Headers(),
});




