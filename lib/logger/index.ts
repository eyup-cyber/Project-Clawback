/**
 * Structured logging system
 * Provides consistent, structured logging with request correlation
 */

/* eslint-disable no-console */

import { getContext, type RequestContext } from './context';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  duration?: number;
  [key: string]: unknown;
}

class Logger {
  private minLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    // Set minimum log level based on environment
    const envLevel = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    this.minLevel = levels.includes(envLevel) ? envLevel : 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatError(error: unknown): LogEntry['error'] {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
        code: (error as { code?: string }).code,
      };
    }
    return {
      name: 'Unknown',
      message: String(error),
    };
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: unknown,
    requestId?: string
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(requestId && { requestId }),
      ...(context && Object.keys(context).length > 0 && { context }),
      ...(error && { error: this.formatError(error) }),
    };

    // Add request context if available
    if (requestId) {
      const requestContext = getContext(requestId);
      if (requestContext) {
        entry.duration = Date.now() - requestContext.startTime;
        entry.method = requestContext.method;
        entry.path = requestContext.path;
        if (requestContext.userId) {
          entry.userId = requestContext.userId;
        }
      }
    }

    return entry;
  }

  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    // In development, use pretty formatting
    if (this.isDevelopment) {
      const prefix = `[${entry.level.toUpperCase()}]`;
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      const requestInfo = entry.requestId ? `[${entry.requestId}]` : '';
      const duration = entry.duration ? ` (+${entry.duration}ms)` : '';

      console.log(`${prefix} ${timestamp} ${requestInfo}${duration} ${entry.message}`);

      if (entry.context && Object.keys(entry.context).length > 0) {
        console.log('  Context:', entry.context);
      }

      if (entry.error) {
        console.error('  Error:', entry.error);
        if (entry.error.stack) {
          console.error(entry.error.stack);
        }
      }
    } else {
      // In production, use JSON format
      console.log(JSON.stringify(entry));
    }
  }

  debug(message: string, context?: Record<string, unknown>, requestId?: string): void {
    this.output(this.createLogEntry('debug', message, context, undefined, requestId));
  }

  info(message: string, context?: Record<string, unknown>, requestId?: string): void {
    this.output(this.createLogEntry('info', message, context, undefined, requestId));
  }

  warn(message: string, context?: Record<string, unknown>, requestId?: string): void {
    this.output(this.createLogEntry('warn', message, context, undefined, requestId));
  }

  error(
    message: string,
    error?: unknown,
    context?: Record<string, unknown>,
    requestId?: string
  ): void {
    this.output(this.createLogEntry('error', message, context, error, requestId));
  }

  /**
   * Log performance metric
   */
  performance(
    operation: string,
    duration: number,
    context?: Record<string, unknown>,
    requestId?: string
  ): void {
    this.info(`Performance: ${operation} took ${duration}ms`, { ...context, duration }, requestId);
  }

  /**
   * Log database query
   */
  query(
    query: string,
    duration: number,
    context?: Record<string, unknown>,
    requestId?: string
  ): void {
    if (this.isDevelopment) {
      this.debug(`Query: ${query}`, { ...context, duration }, requestId);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = {
  debug: (message: string, context?: Record<string, unknown>, requestId?: string) =>
    logger.debug(message, context, requestId),
  info: (message: string, context?: Record<string, unknown>, requestId?: string) =>
    logger.info(message, context, requestId),
  warn: (message: string, context?: Record<string, unknown>, requestId?: string) =>
    logger.warn(message, context, requestId),
  error: (
    message: string,
    error?: unknown,
    context?: Record<string, unknown>,
    requestId?: string
  ) => logger.error(message, error, context, requestId),
  performance: (
    operation: string,
    duration: number,
    context?: Record<string, unknown>,
    requestId?: string
  ) => logger.performance(operation, duration, context, requestId),
  query: (query: string, duration: number, context?: Record<string, unknown>, requestId?: string) =>
    logger.query(query, duration, context, requestId),
};
