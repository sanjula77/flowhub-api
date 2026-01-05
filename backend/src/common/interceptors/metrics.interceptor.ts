import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from '../metrics/metrics.service';

/**
 * Metrics Interceptor
 *
 * Automatically collects metrics for all HTTP requests:
 * - Request count
 * - Response latency
 * - Error count
 * - Status code distribution
 *
 * This interceptor works alongside the RequestTracingInterceptor
 * to provide comprehensive request monitoring.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url } = request;

    // Increment active requests
    this.metricsService.incrementActiveRequests();

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Record successful request
        this.metricsService.recordRequest({
          method,
          path: url,
          statusCode,
          duration,
          timestamp: Date.now(),
        });

        // Decrement active requests
        this.metricsService.decrementActiveRequests();
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || response.statusCode || 500;

        // Record failed request
        this.metricsService.recordRequest({
          method,
          path: url,
          statusCode,
          duration,
          timestamp: Date.now(),
        });

        // Decrement active requests
        this.metricsService.decrementActiveRequests();

        throw error;
      }),
    );
  }
}
