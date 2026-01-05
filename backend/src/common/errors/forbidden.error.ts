import { AppError } from './app.error';

/**
 * Forbidden Error
 *
 * Thrown when user is authenticated but lacks required permissions
 * Maps to HTTP 403 Forbidden
 */
export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly errorCode = 'FORBIDDEN_ERROR';

  constructor(
    message: string = 'Access forbidden',
    requestId?: string,
    metadata?: {
      requiredRole?: string;
      requiredPermission?: string;
      resource?: string;
      [key: string]: any;
    },
  ) {
    super(message, requestId, metadata);
  }
}
