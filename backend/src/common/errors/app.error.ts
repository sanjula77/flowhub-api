/**
 * Base Application Error Class
 *
 * All custom errors should extend this class to ensure:
 * - Consistent error structure
 * - HTTP status code mapping
 * - Proper error serialization
 * - Request ID tracking
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;
  readonly timestamp: string;
  readonly requestId?: string;
  readonly metadata?: Record<string, any>;

  constructor(
    message: string,
    requestId?: string,
    metadata?: Record<string, any>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;
    this.metadata = metadata;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serialize error to JSON for API responses
   */
  toJSON(): {
    statusCode: number;
    errorCode: string;
    message: string;
    timestamp: string;
    requestId?: string;
    metadata?: Record<string, any>;
  } {
    return {
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      message: this.message,
      timestamp: this.timestamp,
      ...(this.requestId && { requestId: this.requestId }),
      ...(this.metadata && { metadata: this.metadata }),
    };
  }
}
