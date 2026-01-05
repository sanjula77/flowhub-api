import { Request } from 'express';

/**
 * Extended Express Request type with user object
 * Attached by Wso2AuthGuard
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        username: string;
        sub?: string;
        email?: string;
        roles?: string[];
        scope?: string;
        apiContext?: string;
        apiVersion?: string;
        token?: string;
      };
      requestId?: string;
    }
  }
}
