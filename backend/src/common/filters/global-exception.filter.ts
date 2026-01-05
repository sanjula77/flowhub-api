import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';
import { AppError } from '../errors/app.error';

/**
 * Global Exception Filter
 *
 * Catches all unhandled exceptions and:
 * - Standardizes API error response format
 * - Logs errors with request context
 * - Includes requestId in responses
 * - Handles validation, auth, and server errors
 *
 * Response Format:
 * {
 *   statusCode: number,
 *   errorCode: string,
 *   message: string,
 *   timestamp: string,
 *   requestId: string,
 *   path: string,
 *   metadata?: object
 * }
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as any).requestId || 'unknown';

    let statusCode: number;
    let errorCode: string;
    let message: string;
    let metadata: Record<string, any> | undefined;

    // Handle custom AppError
    if (exception instanceof AppError) {
      statusCode = exception.statusCode;
      errorCode = exception.errorCode;
      message = exception.message;
      metadata = exception.metadata;

      // Log with appropriate level based on status code
      const logLevel =
        statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';
      this.logger.logWithRequestId(
        `Error: ${message}`,
        requestId,
        logLevel,
        'GlobalExceptionFilter',
        {
          errorCode,
          statusCode,
          path: request.url,
          method: request.method,
          metadata,
        },
      );
    }
    // Handle NestJS HttpException
    else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errorCode = this.getErrorCodeFromStatus(statusCode);
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        errorCode =
          responseObj.errorCode || this.getErrorCodeFromStatus(statusCode);
        metadata = responseObj.metadata;

        // Handle validation errors
        if (
          statusCode === 400 && // HttpStatus.BAD_REQUEST
          Array.isArray(responseObj.message)
        ) {
          message = 'Validation failed';
          metadata = {
            ...metadata,
            validationErrors: responseObj.message,
          };
          errorCode = 'VALIDATION_ERROR';
        }
      } else {
        message = exception.message;
        errorCode = this.getErrorCodeFromStatus(statusCode);
      }

      const logLevel =
        statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';
      this.logger.logWithRequestId(
        `HTTP Exception: ${message}`,
        requestId,
        logLevel,
        'GlobalExceptionFilter',
        {
          errorCode,
          statusCode,
          path: request.url,
          method: request.method,
          metadata,
        },
      );
    }
    // Handle unknown errors
    else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = 'INTERNAL_SERVER_ERROR';
      message =
        process.env.NODE_ENV === 'production'
          ? 'An internal server error occurred'
          : exception instanceof Error
            ? exception.message
            : 'Unknown error';

      // Log full error details
      this.logger.error(
        `Unhandled exception: ${message}`,
        exception instanceof Error ? exception : new Error(String(exception)),
        'GlobalExceptionFilter',
        {
          requestId,
          path: request.url,
          method: request.method,
          stack: exception instanceof Error ? exception.stack : undefined,
        },
      );
    }

    // Build standardized error response
    const errorResponse: {
      statusCode: number;
      errorCode: string;
      message: string;
      timestamp: string;
      requestId: string;
      path: string;
      metadata?: Record<string, any>;
    } = {
      statusCode,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      requestId,
      path: request.url,
    };

    if (metadata) {
      errorResponse.metadata = metadata;
    }

    // Send response
    response.status(statusCode).json(errorResponse);
  }

  /**
   * Map HTTP status code to error code
   */
  private getErrorCodeFromStatus(statusCode: number): string {
    const statusCodeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };

    return statusCodeMap[statusCode] || 'UNKNOWN_ERROR';
  }
}
