/**
 * Cursor-Based Pagination
 * Provides efficient pagination for large datasets
 */

export interface PaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface PaginatedResult<T> {
  items: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
    totalCount?: number;
  };
}

export interface CursorData {
  id: string;
  timestamp: number;
  sortValue?: string | number;
}

/**
 * Encode cursor data to base64 string
 */
export function encodeCursor(data: CursorData): string {
  const json = JSON.stringify(data);
  return Buffer.from(json).toString('base64url');
}

/**
 * Decode cursor string to cursor data
 */
export function decodeCursor(cursor: string): CursorData | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf-8');
    return JSON.parse(json) as CursorData;
  } catch {
    return null;
  }
}

/**
 * Create cursor from an item
 */
export function createCursor<T extends { id: string; created_at?: string; [key: string]: unknown }>(
  item: T,
  sortField: string = 'created_at'
): string {
  const timestamp = item.created_at ? new Date(item.created_at).getTime() : Date.now();

  const sortValue = sortField !== 'created_at' ? (item[sortField] as string | number) : undefined;

  return encodeCursor({
    id: item.id,
    timestamp,
    sortValue,
  });
}

/**
 * Parse pagination parameters from request
 */
export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaults: { limit?: number; maxLimit?: number } = {}
): PaginationParams {
  const { limit: defaultLimit = 20, maxLimit = 100 } = defaults;

  const cursor = searchParams.get('cursor') || undefined;
  const direction = (searchParams.get('direction') || 'forward') as 'forward' | 'backward';
  let limit = parseInt(searchParams.get('limit') || String(defaultLimit), 10);

  // Clamp limit
  limit = Math.max(1, Math.min(limit, maxLimit));

  return { cursor, limit, direction };
}

/**
 * Build pagination response
 */
export function buildPaginatedResponse<T extends { id: string; created_at?: string }>(
  items: T[],
  params: PaginationParams,
  options: {
    sortField?: string;
    totalCount?: number;
    hasMore?: boolean;
  } = {}
): PaginatedResult<T> {
  const { sortField = 'created_at', totalCount, hasMore } = options;
  const { limit = 20, direction = 'forward' } = params;

  // Determine if there are more pages
  const hasExtraItem = items.length > limit;
  const actualItems = hasExtraItem ? items.slice(0, limit) : items;

  // Calculate page info
  const hasNextPage = direction === 'forward' ? (hasMore ?? hasExtraItem) : !!params.cursor;

  const hasPreviousPage = direction === 'forward' ? !!params.cursor : (hasMore ?? hasExtraItem);

  // Generate cursors
  const startCursor = actualItems.length > 0 ? createCursor(actualItems[0], sortField) : null;

  const endCursor =
    actualItems.length > 0 ? createCursor(actualItems[actualItems.length - 1], sortField) : null;

  return {
    items: actualItems,
    pageInfo: {
      hasNextPage,
      hasPreviousPage,
      startCursor,
      endCursor,
      ...(totalCount !== undefined && { totalCount }),
    },
  };
}

/**
 * Build SQL WHERE clause for cursor-based pagination
 */
export function buildCursorWhereClause(
  cursor: string | undefined,
  options: {
    idColumn?: string;
    sortColumn?: string;
    sortDirection?: 'ASC' | 'DESC';
    direction?: 'forward' | 'backward';
  } = {}
): { clause: string; values: unknown[] } | null {
  if (!cursor) return null;

  const cursorData = decodeCursor(cursor);
  if (!cursorData) return null;

  const {
    idColumn = 'id',
    sortColumn = 'created_at',
    sortDirection = 'DESC',
    direction = 'forward',
  } = options;

  // Determine comparison operator
  const isDescending = sortDirection === 'DESC';
  const isForward = direction === 'forward';
  const operator = (isDescending && isForward) || (!isDescending && !isForward) ? '<' : '>';

  if (sortColumn === 'created_at') {
    // Use timestamp directly
    return {
      clause: `(${sortColumn} ${operator} $1 OR (${sortColumn} = $1 AND ${idColumn} ${operator} $2))`,
      values: [new Date(cursorData.timestamp).toISOString(), cursorData.id],
    };
  }

  // For other sort columns
  return {
    clause: `(${sortColumn} ${operator} $1 OR (${sortColumn} = $1 AND ${idColumn} ${operator} $2))`,
    values: [cursorData.sortValue ?? cursorData.timestamp, cursorData.id],
  };
}

/**
 * Offset-based pagination (simpler but less efficient for large datasets)
 */
export interface OffsetPaginationParams {
  page?: number;
  limit?: number;
}

export interface OffsetPaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export function parseOffsetPaginationParams(
  searchParams: URLSearchParams,
  defaults: { limit?: number; maxLimit?: number } = {}
): OffsetPaginationParams {
  const { limit: defaultLimit = 20, maxLimit = 100 } = defaults;

  let page = parseInt(searchParams.get('page') || '1', 10);
  let limit = parseInt(searchParams.get('limit') || String(defaultLimit), 10);

  page = Math.max(1, page);
  limit = Math.max(1, Math.min(limit, maxLimit));

  return { page, limit };
}

export function buildOffsetPaginatedResponse<T>(
  items: T[],
  totalCount: number,
  params: OffsetPaginationParams
): OffsetPaginatedResult<T> {
  const { page = 1, limit = 20 } = params;
  const totalPages = Math.ceil(totalCount / limit);

  return {
    items,
    pagination: {
      page,
      limit,
      totalItems: totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
