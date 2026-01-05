import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LoggerService } from './common/logger/logger.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestTracingInterceptor } from './common/interceptors/request-tracing.interceptor';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { MetricsService } from './common/metrics/metrics.service';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      bufferLogs: true, // Buffer logs until logger is ready
    });

    // Get logger instances
    const winstonLogger = app.get(WINSTON_MODULE_NEST_PROVIDER);
    const loggerService = app.get(LoggerService);
    const metricsService = app.get(MetricsService);

    // Set logger as NestJS logger
    app.useLogger(winstonLogger);

    // Configure body parsers
    app.use(json({ limit: '10mb' }));
    app.use(urlencoded({ extended: true, limit: '10mb' }));
    app.use(cookieParser());

    // Enable DTO validation globally
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Strip properties that don't have decorators
        forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are sent
        transform: true, // Automatically transform payloads to DTO instances
        transformOptions: {
          enableImplicitConversion: true, // Enable implicit type conversion
        },
      }),
    );

    // Register global exception filter
    app.useGlobalFilters(new GlobalExceptionFilter(loggerService));

    // Register global interceptors
    app.useGlobalInterceptors(
      new RequestTracingInterceptor(loggerService),
      new MetricsInterceptor(metricsService),
    );

    app.enableCors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    const port = process.env.PORT ?? 3001;
    await app.listen(port, '0.0.0.0');

    loggerService.log(
      `Application is running on: http://0.0.0.0:${port}`,
      'Bootstrap',
      {
        port,
        environment: process.env.NODE_ENV || 'development',
      },
    );
  } catch (error) {
    // Fallback to console if logger not available
    console.error('Error during application bootstrap:', error);
    process.exit(1);
  }
}
bootstrap();
