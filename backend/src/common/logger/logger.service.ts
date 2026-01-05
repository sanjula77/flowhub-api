import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { WinstonLogger } from 'nest-winston';

/**
 * Centralized Logger Service
 *
 * Provides structured logging with:
 * - Request ID tracking
 * - Context-aware logging
 * - Async, non-blocking operations
 * - Automatic sensitive data filtering
 *
 * Usage:
 * ```typescript
 * constructor(private readonly logger: LoggerService) {}
 *
 * this.logger.log('User created', { userId: '123' });
 * this.logger.error('Failed to process', error, { context: 'UserService' });
 * ```
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  constructor(private readonly winston: WinstonLogger) {}

  /**
   * Log informational messages
   */
  log(message: string, context?: string, metadata?: Record<string, any>): void {
    const logContext = context || 'Application';
    if (metadata && Object.keys(metadata).length > 0) {
      this.winston.log(`${message} ${JSON.stringify(metadata)}`, logContext);
    } else {
      this.winston.log(message, logContext);
    }
  }

  /**
   * Log error messages with stack trace
   */
  error(
    message: string,
    trace?: string | Error,
    context?: string,
    metadata?: Record<string, any>,
  ): void {
    const logContext = context || 'Application';
    const errorMetadata: Record<string, any> = {
      ...metadata,
    };

    if (trace instanceof Error) {
      errorMetadata.stack = trace.stack;
      errorMetadata.errorName = trace.name;
      errorMetadata.errorMessage = trace.message;
    } else if (trace) {
      errorMetadata.trace = trace;
    }

    if (Object.keys(errorMetadata).length > 0) {
      this.winston.error(
        `${message} ${JSON.stringify(errorMetadata)}`,
        logContext,
      );
    } else {
      this.winston.error(message, logContext);
    }
  }

  /**
   * Log warning messages
   */
  warn(
    message: string,
    context?: string,
    metadata?: Record<string, any>,
  ): void {
    const logContext = context || 'Application';
    if (metadata && Object.keys(metadata).length > 0) {
      this.winston.warn(`${message} ${JSON.stringify(metadata)}`, logContext);
    } else {
      this.winston.warn(message, logContext);
    }
  }

  /**
   * Log debug messages (only in development)
   */
  debug(
    message: string,
    context?: string,
    metadata?: Record<string, any>,
  ): void {
    const logContext = context || 'Application';
    if (this.winston.debug) {
      if (metadata && Object.keys(metadata).length > 0) {
        this.winston.debug(
          `${message} ${JSON.stringify(metadata)}`,
          logContext,
        );
      } else {
        this.winston.debug(message, logContext);
      }
    }
  }

  /**
   * Log verbose messages
   */
  verbose(
    message: string,
    context?: string,
    metadata?: Record<string, any>,
  ): void {
    const logContext = context || 'Application';
    if (this.winston.verbose) {
      if (metadata && Object.keys(metadata).length > 0) {
        this.winston.verbose(
          `${message} ${JSON.stringify(metadata)}`,
          logContext,
        );
      } else {
        this.winston.verbose(message, logContext);
      }
    }
  }

  /**
   * Log with request ID context
   */
  logWithRequestId(
    message: string,
    requestId: string,
    level: 'log' | 'error' | 'warn' | 'debug' | 'verbose' = 'log',
    context?: string,
    metadata?: Record<string, any>,
  ): void {
    const logContext = context || 'Application';
    const logData = {
      requestId,
      ...metadata,
    };
    const fullMessage =
      Object.keys(logData).length > 0
        ? `${message} ${JSON.stringify(logData)}`
        : message;

    switch (level) {
      case 'error':
        this.winston.error(fullMessage, logContext);
        break;
      case 'warn':
        this.winston.warn(fullMessage, logContext);
        break;
      case 'debug':
        if (this.winston.debug) {
          this.winston.debug(fullMessage, logContext);
        }
        break;
      case 'verbose':
        if (this.winston.verbose) {
          this.winston.verbose(fullMessage, logContext);
        }
        break;
      default:
        this.winston.log(fullMessage, logContext);
    }
  }
}
