import { AppError } from './app.error';

/**
 * Not Found Error
 *
 * Thrown when a requested resource is not found
 * Maps to HTTP 404 Not Found
 */
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly errorCode = 'NOT_FOUND_ERROR';

  constructor(
    message: string = 'Resource not found',
    requestId?: string,
    metadata?: {
      resource?: string;
      resourceId?: string;
      [key: string]: any;
    },
  ) {
    super(message, requestId, metadata);
  }
}
