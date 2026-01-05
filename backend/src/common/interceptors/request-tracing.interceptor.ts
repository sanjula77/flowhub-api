import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from '../logger/logger.service';

/**
 * Request Tracing Interceptor
 *
 * Generates a unique requestId for every HTTP request and:
 * - Attaches requestId to request object
 * - Includes requestId in all logs
 * - Adds requestId to response headers
 *
 * This enables end-to-end request tracing across services.
 */
@Injectable()
export class RequestTracingInterceptor implements NestInterceptor {
  private readonly logger: LoggerService;

  constructor(logger: LoggerService) {
    this.logger = logger;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;

    // Generate or use existing requestId from header
    const requestId = (request.headers['x-request-id'] as string) || uuidv4();

    // Attach requestId to request object for use throughout the request lifecycle
    (request as any).requestId = requestId;

    // Log incoming request
    this.logger.logWithRequestId(
      `Incoming ${method} ${url}`,
      requestId,
      'log',
      'RequestTracing',
      {
        method,
        url,
        ip,
        userAgent: request.headers['user-agent'],
        userId: (request as any).user?.sub || (request as any).user?.username,
      },
    );

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const duration = Date.now() - startTime;

        // Add requestId to response headers
        response.setHeader('X-Request-ID', requestId);

        // Log successful response
        this.logger.logWithRequestId(
          `${method} ${url} completed`,
          requestId,
          'log',
          'RequestTracing',
          {
            method,
            url,
            statusCode: response.statusCode,
            duration: `${duration}ms`,
          },
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const response = context.switchToHttp().getResponse();

        // Add requestId to response headers even on error
        response.setHeader('X-Request-ID', requestId);

        // Log error with requestId
        this.logger.logWithRequestId(
          `${method} ${url} failed`,
          requestId,
          'error',
          'RequestTracing',
          {
            method,
            url,
            statusCode: response.statusCode || 500,
            duration: `${duration}ms`,
            error: error.message,
          },
        );

        throw error;
      }),
    );
  }
}
