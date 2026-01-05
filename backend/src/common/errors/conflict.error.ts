import { AppError } from './app.error';

/**
 * Conflict Error
 *
 * Thrown when a request conflicts with the current state (e.g., duplicate entry)
 * Maps to HTTP 409 Conflict
 */
export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly errorCode = 'CONFLICT_ERROR';

  constructor(
    message: string = 'Resource conflict',
    requestId?: string,
    metadata?: {
      resource?: string;
      conflictingField?: string;
      [key: string]: any;
    },
  ) {
    super(message, requestId, metadata);
  }
}
