/**
 * Test mocks and mock helpers
 * Provides reusable mock implementations for tests
 */

/**
 * Creates a chainable mock query builder
 * All chain methods return the mock itself for unlimited chaining
 */
export function createChainableMock() {
  const mock: Record<string, jest.Mock> = {};

  // Chain methods that return the mock itself
  const chainMethods = [
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'like',
    'ilike',
    'is',
    'in',
    'contains',
    'containedBy',
    'rangeLt',
    'rangeGt',
    'rangeGte',
    'rangeLte',
    'rangeAdjacent',
    'overlaps',
    'textSearch',
    'match',
    'not',
    'or',
    'filter',
    'order',
    'limit',
    'range',
  ];

  chainMethods.forEach((method) => {
    mock[method] = jest.fn().mockReturnValue(mock);
  });

  // Terminal methods that return promises
  mock.single = jest.fn().mockResolvedValue({ data: null, error: null });
  mock.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });

  // Make the mock thenable so it can be awaited directly
  mock.then = jest.fn((resolve) => resolve({ data: null, error: null, count: null }));

  return mock;
}

/**
 * Creates a mock Supabase client with chainable query builder
 * Returns a client that can be customized per test
 */
export function createMockSupabaseClient() {
  const mockQuery = createChainableMock();

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signIn: jest.fn().mockResolvedValue({ data: null, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn().mockReturnValue(mockQuery),
    _query: mockQuery, // Expose for test customization
  };
}

/**
 * Type for mock Supabase client
 */
export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
