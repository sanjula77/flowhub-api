import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * WSO2AuthGuard - Lightweight guard for routes protected by WSO2 API Manager
 *
 * This guard assumes WSO2 has already validated:
 * - OAuth 2.0 access token
 * - JWT signature verification
 * - Token expiry
 * - Scope and subscription checks
 *
 * This guard only:
 * - Checks for Authorization header presence
 * - Extracts user info from WSO2 forwarded headers (if available)
 * - Attaches user object to request for downstream use
 */
@Injectable()
export class Wso2AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // WSO2 may forward the token in different ways:
    // 1. Original Authorization header (if forwarded)
    // 2. X-JWT-Assertion header (WSO2's standard way)
    // 3. X-Auth-Token header (alternative)

    let token: string | null = null;

    // Try Authorization header first
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    // Try WSO2's X-JWT-Assertion header (most common)
    else if (request.headers['x-jwt-assertion']) {
      token = request.headers['x-jwt-assertion'] as string;
    }
    // Try X-Auth-Token as fallback
    else if (request.headers['x-auth-token']) {
      token = request.headers['x-auth-token'] as string;
    }

    // Check if request came through WSO2 Gateway
    // WSO2 adds certain headers when forwarding requests
    const isWso2Request = this.isRequestFromWso2(request);

    // If no token found, check if request came from WSO2
    // If WSO2 validated the token, we trust it even without the header
    if (!token && !isWso2Request) {
      // Log all headers for debugging (remove in production)
      // Debug logging removed - use logger service in production

      throw new UnauthorizedException(
        'Missing or invalid Authorization header. Token must be provided as Bearer token, or request must come through WSO2 API Gateway.',
      );
    }

    // Extract user information from WSO2 forwarded headers
    // WSO2 may forward user claims in custom headers
    const user = this.extractUserFromHeaders(request, token || '');

    // Attach user object to request for downstream controllers
    request.user = user;

    return true;
  }

  /**
   * Detects if request came through WSO2 API Gateway
   * WSO2 adds certain headers or patterns when forwarding requests
   */
  private isRequestFromWso2(request: Request): boolean {
    // Check for WSO2-specific headers
    const hasWso2Headers =
      request.headers['x-wso2-username'] ||
      request.headers['x-wso2-api-context'] ||
      request.headers['x-wso2-api-name'] ||
      request.headers['x-wso2-api-version'] ||
      request.headers['x-wso2-request-id'] ||
      request.headers['activityid']; // WSO2 adds this header

    // Check if request has activityid (WSO2's request tracking header)
    // This is a reliable indicator that request came through WSO2
    if (request.headers['activityid']) {
      return true;
    }

    // Check host - if request comes from WSO2 container, host might be different
    const host = request.headers.host;
    if (host && (host.includes('wso2') || host.includes('8243'))) {
      return true;
    }

    // If WSO2 headers are present, definitely from WSO2
    if (hasWso2Headers) {
      return true;
    }

    // Check referer or origin (if available)
    const referer = request.headers.referer;
    if (referer && referer.includes('wso2')) {
      return true;
    }

    return false;
  }

  /**
   * Extracts user information from WSO2 forwarded headers
   *
   * WSO2 may forward user claims in headers like:
   * - X-WSO2-USERNAME
   * - X-WSO2-API-CONTEXT
   * - X-WSO2-API-VERSION
   * - X-WSO2-API-NAME
   * - X-JWT-ASSERTION (if JWT is forwarded)
   *
   * You can also decode the token (without verification) to extract claims
   */
  private extractUserFromHeaders(request: Request, token: string): any {
    // Try to get user info from WSO2 forwarded headers
    const username = request.headers['x-wso2-username'] as string;
    const apiContext = request.headers['x-wso2-api-context'] as string;
    const apiVersion = request.headers['x-wso2-api-version'] as string;
    const apiName = request.headers['x-wso2-api-name'] as string;
    const jwtAssertion = request.headers['x-jwt-assertion'] as string;

    // If WSO2 forwards JWT assertion, decode it (without verification)
    let decodedClaims: any = null;
    if (jwtAssertion) {
      decodedClaims = this.decodeJwtWithoutVerification(jwtAssertion);
    } else if (token) {
      // Fallback: decode the bearer token (without verification)
      decodedClaims = this.decodeJwtWithoutVerification(token);
    }

    // Build user object from available sources
    const activityId = request.headers['activityid'] as string;
    const isWso2Request = !!activityId;

    // Extract role from token claims or default to USER
    // Token might have: role, roles (array), or scope
    let userRole = decodedClaims?.role;
    if (
      !userRole &&
      decodedClaims?.roles &&
      Array.isArray(decodedClaims.roles)
    ) {
      // If roles is an array, check if ADMIN is in it
      userRole = decodedClaims.roles.includes('ADMIN') ? 'ADMIN' : 'USER';
    }
    if (!userRole && decodedClaims?.scope) {
      // Check scope for admin
      const scopes = decodedClaims.scope.split(' ');
      userRole =
        scopes.includes('admin') || scopes.includes('ADMIN') ? 'ADMIN' : 'USER';
    }
    // Default to USER if no role found
    userRole = userRole || 'USER';

    const user: any = {
      // From WSO2 headers (preferred source)
      username:
        username ||
        decodedClaims?.sub ||
        decodedClaims?.username ||
        (isWso2Request ? 'wso2-validated-user' : 'anonymous'),
      apiContext: apiContext || decodedClaims?.apiContext,
      apiVersion: apiVersion || decodedClaims?.apiVersion,
      apiName: apiName || decodedClaims?.apiName,

      // From decoded token claims (if available)
      sub: decodedClaims?.sub,
      email: decodedClaims?.email,
      role: userRole, // Single role for RolesGuard
      roles: decodedClaims?.roles ||
        decodedClaims?.scope?.split(' ') || [userRole], // Array for reference
      scope: decodedClaims?.scope,

      // WSO2 request tracking
      activityId: activityId,
      validatedByWso2: isWso2Request,

      // Token info (for reference)
      token: token
        ? token.substring(0, 20) + '...'
        : isWso2Request
          ? 'wso2-validated'
          : 'no-token', // Truncated for logging
    };

    return user;
  }

  /**
   * Decodes JWT token without verification
   * Only extracts claims, does NOT verify signature
   * Safe because WSO2 has already validated the token
   */
  private decodeJwtWithoutVerification(token: string): any {
    try {
      // JWT format: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      // Decode payload (base64url)
      const payload = parts[1];
      const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      // If decoding fails, return null (not critical)
      return null;
    }
  }
}
