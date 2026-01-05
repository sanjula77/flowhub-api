import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Wso2AuthGuard } from './wso2-auth.guard';
import { Request } from 'express';

describe('Wso2AuthGuard', () => {
  let guard: Wso2AuthGuard;
  let context: ExecutionContext;
  let mockRequest: Partial<Request>;

  beforeEach(() => {
    guard = new Wso2AuthGuard();
    mockRequest = {
      headers: {},
      user: undefined,
    };
  });

  const createMockContext = (request: Partial<Request>): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should allow access with Bearer token in Authorization header', () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token-here',
      };
      context = createMockContext(mockRequest);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest.user).toBeDefined();
    });

    it('should allow access with X-JWT-Assertion header', () => {
      mockRequest.headers = {
        'x-jwt-assertion': 'jwt-token-here',
      };
      context = createMockContext(mockRequest);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest.user).toBeDefined();
    });

    it('should allow access with X-Auth-Token header', () => {
      mockRequest.headers = {
        'x-auth-token': 'auth-token-here',
      };
      context = createMockContext(mockRequest);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest.user).toBeDefined();
    });

    it('should allow access if request comes from WSO2 (activityid header)', () => {
      mockRequest.headers = {
        activityid: 'some-activity-id',
      };
      context = createMockContext(mockRequest);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest.user).toBeDefined();
    });

    it('should allow access if request comes from WSO2 (x-wso2-username header)', () => {
      mockRequest.headers = {
        'x-wso2-username': 'testuser',
      };
      context = createMockContext(mockRequest);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest.user).toBeDefined();
    });

    it('should allow access if request comes from WSO2 (host contains wso2)', () => {
      mockRequest.headers = {
        host: 'wso2-gateway:8243',
      };
      context = createMockContext(mockRequest);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest.user).toBeDefined();
    });

    it('should allow access if request comes from WSO2 (host contains 8243)', () => {
      mockRequest.headers = {
        host: 'gateway:8243',
      };
      context = createMockContext(mockRequest);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest.user).toBeDefined();
    });

    it('should allow access if request comes from WSO2 (referer contains wso2)', () => {
      mockRequest.headers = {
        referer: 'https://wso2-gateway.example.com/api',
      };
      context = createMockContext(mockRequest);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest.user).toBeDefined();
    });

    it('should throw UnauthorizedException if no token and not from WSO2', () => {
      mockRequest.headers = {};
      context = createMockContext(mockRequest);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(
        'Missing or invalid Authorization header',
      );
    });

    it('should extract user from JWT token in Authorization header', () => {
      // Create a valid JWT token (header.payload.signature)
      const payload = Buffer.from(
        JSON.stringify({
          sub: 'user123',
          email: 'test@example.com',
          role: 'ADMIN',
        }),
      ).toString('base64url');
      const token = `header.${payload}.signature`;
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };
      context = createMockContext(mockRequest);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest.user).toBeDefined();
      expect((mockRequest.user as any).sub).toBe('user123');
      expect((mockRequest.user as any).email).toBe('test@example.com');
      expect((mockRequest.user as any).role).toBe('ADMIN');
    });

    it('should extract user from WSO2 headers', () => {
      mockRequest.headers = {
        'x-wso2-username': 'testuser',
        'x-wso2-api-context': '/api/v1',
        'x-wso2-api-version': '1.0.0',
        'x-wso2-api-name': 'test-api',
        activityid: 'activity-123',
      };
      context = createMockContext(mockRequest);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest.user).toBeDefined();
      expect((mockRequest.user as any).username).toBe('testuser');
      expect((mockRequest.user as any).apiContext).toBe('/api/v1');
      expect((mockRequest.user as any).apiVersion).toBe('1.0.0');
      expect((mockRequest.user as any).apiName).toBe('test-api');
    });

    it('should extract role from roles array in token', () => {
      const payload = Buffer.from(
        JSON.stringify({ sub: 'user123', roles: ['ADMIN', 'USER'] }),
      ).toString('base64url');
      const token = `header.${payload}.signature`;
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };
      context = createMockContext(mockRequest);

      guard.canActivate(context);

      expect((mockRequest.user as any).role).toBe('ADMIN');
    });

    it('should extract role from scope in token', () => {
      const payload = Buffer.from(
        JSON.stringify({ sub: 'user123', scope: 'admin read write' }),
      ).toString('base64url');
      const token = `header.${payload}.signature`;
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };
      context = createMockContext(mockRequest);

      guard.canActivate(context);

      expect((mockRequest.user as any).role).toBe('ADMIN');
    });

    it('should default to USER role if no role found', () => {
      const payload = Buffer.from(JSON.stringify({ sub: 'user123' })).toString(
        'base64url',
      );
      const token = `header.${payload}.signature`;
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };
      context = createMockContext(mockRequest);

      guard.canActivate(context);

      expect((mockRequest.user as any).role).toBe('USER');
    });

    it('should handle invalid JWT token gracefully', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid.token',
      };
      context = createMockContext(mockRequest);

      const result = guard.canActivate(context);

      // Should still allow access (WSO2 validates, we just decode)
      expect(result).toBe(true);
      expect(mockRequest.user).toBeDefined();
    });

    it('should handle malformed JWT token', () => {
      mockRequest.headers = {
        authorization: 'Bearer not-a-jwt',
      };
      context = createMockContext(mockRequest);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest.user).toBeDefined();
    });

    it('should prefer X-JWT-Assertion over Authorization header', () => {
      const payload = Buffer.from(
        JSON.stringify({ sub: 'jwt-user', role: 'ADMIN' }),
      ).toString('base64url');
      const jwtToken = `header.${payload}.signature`;
      mockRequest.headers = {
        authorization: 'Bearer bearer-token',
        'x-jwt-assertion': jwtToken,
      };
      context = createMockContext(mockRequest);

      guard.canActivate(context);

      expect((mockRequest.user as any).sub).toBe('jwt-user');
    });
  });
});
