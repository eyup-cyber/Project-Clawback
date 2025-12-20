/**
 * OpenTelemetry Tracing
 * Distributed tracing for performance monitoring
 */

export interface Span {
  id: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'OK' | 'ERROR' | 'UNSET';
  attributes: Record<string, string | number | boolean>;
  events: SpanEvent[];
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, string | number | boolean>;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
}

// Active spans storage
const activeSpans = new Map<string, Span>();
const completedSpans: Span[] = [];
const MAX_COMPLETED_SPANS = 1000;

/**
 * Generate random hex ID
 */
function generateId(length: number = 16): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate trace ID (32 hex chars)
 */
export function generateTraceId(): string {
  return generateId(16);
}

/**
 * Generate span ID (16 hex chars)
 */
export function generateSpanId(): string {
  return generateId(8);
}

/**
 * Start a new span
 */
export function startSpan(
  name: string,
  options?: {
    traceId?: string;
    parentSpanId?: string;
    attributes?: Record<string, string | number | boolean>;
  }
): Span {
  const span: Span = {
    id: generateSpanId(),
    traceId: options?.traceId || generateTraceId(),
    parentSpanId: options?.parentSpanId,
    name,
    startTime: Date.now(),
    status: 'UNSET',
    attributes: options?.attributes || {},
    events: [],
  };

  activeSpans.set(span.id, span);
  return span;
}

/**
 * End a span
 */
export function endSpan(
  spanOrId: Span | string,
  options?: {
    status?: 'OK' | 'ERROR';
    attributes?: Record<string, string | number | boolean>;
  }
): Span | null {
  const spanId = typeof spanOrId === 'string' ? spanOrId : spanOrId.id;
  const span = activeSpans.get(spanId);

  if (!span) {
    console.warn(`Span ${spanId} not found`);
    return null;
  }

  span.endTime = Date.now();
  span.duration = span.endTime - span.startTime;
  span.status = options?.status || 'OK';

  if (options?.attributes) {
    span.attributes = { ...span.attributes, ...options.attributes };
  }

  activeSpans.delete(spanId);

  // Store completed span
  completedSpans.push(span);
  if (completedSpans.length > MAX_COMPLETED_SPANS) {
    completedSpans.shift();
  }

  return span;
}

/**
 * Add event to a span
 */
export function addSpanEvent(
  spanOrId: Span | string,
  name: string,
  attributes?: Record<string, string | number | boolean>
): void {
  const spanId = typeof spanOrId === 'string' ? spanOrId : spanOrId.id;
  const span = activeSpans.get(spanId);

  if (!span) {
    console.warn(`Span ${spanId} not found`);
    return;
  }

  span.events.push({
    name,
    timestamp: Date.now(),
    attributes,
  });
}

/**
 * Set span attribute
 */
export function setSpanAttribute(
  spanOrId: Span | string,
  key: string,
  value: string | number | boolean
): void {
  const spanId = typeof spanOrId === 'string' ? spanOrId : spanOrId.id;
  const span = activeSpans.get(spanId);

  if (span) {
    span.attributes[key] = value;
  }
}

/**
 * Set span status to error
 */
export function setSpanError(spanOrId: Span | string, error: Error | string): void {
  const spanId = typeof spanOrId === 'string' ? spanOrId : spanOrId.id;
  const span = activeSpans.get(spanId);

  if (span) {
    span.status = 'ERROR';
    span.attributes['error'] = true;
    span.attributes['error.message'] = typeof error === 'string' ? error : error.message;
    if (error instanceof Error && error.stack) {
      span.attributes['error.stack'] = error.stack;
    }
  }
}

/**
 * Create trace context from headers
 */
export function extractTraceContext(
  headers: Headers | Record<string, string>
): TraceContext | null {
  const traceparent =
    headers instanceof Headers ? headers.get('traceparent') : headers['traceparent'];

  if (!traceparent) return null;

  // Parse W3C traceparent format: version-traceId-spanId-traceFlags
  const match = traceparent.match(/^(\d{2})-([a-f0-9]{32})-([a-f0-9]{16})-(\d{2})$/);
  if (!match) return null;

  return {
    traceId: match[2],
    spanId: match[3],
    traceFlags: parseInt(match[4], 16),
  };
}

/**
 * Create traceparent header value
 */
export function createTraceparent(span: Span): string {
  return `00-${span.traceId}-${span.id}-01`;
}

/**
 * Inject trace context into headers
 */
export function injectTraceContext(span: Span, headers: Headers | Record<string, string>): void {
  const traceparent = createTraceparent(span);

  if (headers instanceof Headers) {
    headers.set('traceparent', traceparent);
  } else {
    headers['traceparent'] = traceparent;
  }
}

/**
 * Wrap async function with tracing
 */
export function trace<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  options?: {
    traceId?: string;
    parentSpanId?: string;
    attributes?: Record<string, string | number | boolean>;
  }
): Promise<T> {
  const span = startSpan(name, options);

  return fn(span)
    .then((result) => {
      endSpan(span, { status: 'OK' });
      return result;
    })
    .catch((error) => {
      setSpanError(span, error);
      endSpan(span, { status: 'ERROR' });
      throw error;
    });
}

/**
 * Create a child span
 */
export function createChildSpan(
  parent: Span,
  name: string,
  attributes?: Record<string, string | number | boolean>
): Span {
  return startSpan(name, {
    traceId: parent.traceId,
    parentSpanId: parent.id,
    attributes,
  });
}

/**
 * Get all active spans
 */
export function getActiveSpans(): Span[] {
  return Array.from(activeSpans.values());
}

/**
 * Get completed spans
 */
export function getCompletedSpans(limit: number = 100): Span[] {
  return completedSpans.slice(-limit);
}

/**
 * Get spans by trace ID
 */
export function getSpansByTraceId(traceId: string): Span[] {
  return [
    ...Array.from(activeSpans.values()).filter((s) => s.traceId === traceId),
    ...completedSpans.filter((s) => s.traceId === traceId),
  ];
}

/**
 * Clear all spans (for testing)
 */
export function clearSpans(): void {
  activeSpans.clear();
  completedSpans.length = 0;
}

/**
 * Standard span attribute keys
 */
export const SpanAttributes = {
  // HTTP
  HTTP_METHOD: 'http.method',
  HTTP_URL: 'http.url',
  HTTP_STATUS_CODE: 'http.status_code',
  HTTP_USER_AGENT: 'http.user_agent',

  // Database
  DB_SYSTEM: 'db.system',
  DB_NAME: 'db.name',
  DB_OPERATION: 'db.operation',
  DB_STATEMENT: 'db.statement',

  // Service
  SERVICE_NAME: 'service.name',
  SERVICE_VERSION: 'service.version',

  // User
  USER_ID: 'user.id',
  USER_ROLE: 'user.role',

  // Custom
  COMPONENT: 'component',
  OPERATION: 'operation',
} as const;

/**
 * Middleware helper for Next.js API routes
 */
export function withTracing<T extends (...args: unknown[]) => Promise<unknown>>(
  handler: T,
  name: string
): T {
  return (async (...args: unknown[]) => {
    const span = startSpan(name, {
      attributes: {
        [SpanAttributes.COMPONENT]: 'api',
      },
    });

    try {
      const result = await handler(...args);
      endSpan(span, { status: 'OK' });
      return result;
    } catch (error) {
      setSpanError(span, error instanceof Error ? error : new Error(String(error)));
      endSpan(span, { status: 'ERROR' });
      throw error;
    }
  }) as T;
}

/**
 * Export spans in OTLP format (simplified)
 */
export function exportSpansOTLP(): object[] {
  return completedSpans.map((span) => ({
    traceId: span.traceId,
    spanId: span.id,
    parentSpanId: span.parentSpanId,
    name: span.name,
    kind: 1, // SPAN_KIND_SERVER
    startTimeUnixNano: span.startTime * 1_000_000,
    endTimeUnixNano: (span.endTime || Date.now()) * 1_000_000,
    attributes: Object.entries(span.attributes).map(([key, value]) => ({
      key,
      value: { stringValue: String(value) },
    })),
    events: span.events.map((event) => ({
      name: event.name,
      timeUnixNano: event.timestamp * 1_000_000,
      attributes: event.attributes
        ? Object.entries(event.attributes).map(([key, value]) => ({
            key,
            value: { stringValue: String(value) },
          }))
        : [],
    })),
    status: {
      code: span.status === 'OK' ? 1 : span.status === 'ERROR' ? 2 : 0,
    },
  }));
}
