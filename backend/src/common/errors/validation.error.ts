import { AppError } from './app.error';

/**
 * Validation Error
 *
 * Thrown when input validation fails (e.g., DTO validation)
 * Maps to HTTP 400 Bad Request
 */
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly errorCode = 'VALIDATION_ERROR';

  constructor(
    message: string = 'Validation failed',
    requestId?: string,
    metadata?: {
      field?: string;
      value?: any;
      constraints?: Record<string, string>;
      [key: string]: any;
    },
  ) {
    super(message, requestId, metadata);
  }
}
