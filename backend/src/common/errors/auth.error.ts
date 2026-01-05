import { AppError } from './app.error';

/**
 * Authentication Error
 *
 * Thrown when authentication fails (invalid credentials, missing token, etc.)
 * Maps to HTTP 401 Unauthorized
 */
export class AuthError extends AppError {
  readonly statusCode = 401;
  readonly errorCode = 'AUTH_ERROR';

  constructor(
    message: string = 'Authentication failed',
    requestId?: string,
    metadata?: {
      reason?: string;
      [key: string]: any;
    },
  ) {
    super(message, requestId, metadata);
  }
}
