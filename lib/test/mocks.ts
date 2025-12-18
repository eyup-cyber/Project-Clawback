/**
 * Test mocks and mock helpers
 * Provides reusable mock implementations for tests
 */

// Chain methods that return the mock itself for unlimited chaining
const CHAIN_METHODS = [
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

/**
 * Creates a chainable mock query builder
 * All chain methods return the mock itself for unlimited chaining
 * Terminal methods (single, maybeSingle, then) return promises
 */
export function createChainableMock(
  defaultResult: {
    data?: unknown;
    error?: unknown;
    count?: number | null;
  } = {}
) {
  const mock: Record<string, jest.Mock> = {};

  const result = {
    data: defaultResult.data ?? null,
    error: defaultResult.error ?? null,
    count: defaultResult.count ?? null,
  };

  CHAIN_METHODS.forEach((method) => {
    mock[method] = jest.fn().mockReturnValue(mock);
  });

  // Terminal methods that return promises
  mock.single = jest.fn().mockResolvedValue({ data: result.data, error: result.error });
  mock.maybeSingle = jest.fn().mockResolvedValue({ data: result.data, error: result.error });

  // Make the mock thenable so it can be awaited directly (for queries without .single())
  mock.then = jest.fn((resolve) => resolve(result));

  return mock;
}

/**
 * Creates a mock Supabase client with chainable query builder
 * Returns a client that can be customized per test
 *
 * Usage in tests:
 *   const mockClient = createMockSupabaseClient();
 *   // Configure terminal method results:
 *   mockClient._query.single.mockResolvedValue({ data: myData, error: null });
 *   mockClient._query.then.mockImplementation((resolve) => resolve({ data: myData, error: null, count: 10 }));
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

/**
 * Type for chainable mock query
 */
export type ChainableMock = ReturnType<typeof createChainableMock>;
