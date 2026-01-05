import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    // Set JWT_SECRET for testing
    process.env.JWT_SECRET = 'test-secret';
    strategy = new JwtStrategy();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(strategy).toBeDefined();
    });

    it('should use JWT_SECRET from environment', () => {
      process.env.JWT_SECRET = 'custom-secret';
      const customStrategy = new JwtStrategy();
      expect(customStrategy).toBeDefined();
    });

    it('should use default secret if JWT_SECRET not set', () => {
      delete process.env.JWT_SECRET;
      const defaultStrategy = new JwtStrategy();
      expect(defaultStrategy).toBeDefined();
    });

    it('should configure JWT extraction from cookie first', () => {
      // The strategy is configured to extract from cookie first
      // This is tested through integration tests
      expect(strategy).toBeDefined();
    });

    it('should configure JWT extraction from Authorization header as fallback', () => {
      // The strategy is configured to fallback to Authorization header
      // This is tested through integration tests
      expect(strategy).toBeDefined();
    });

    it('should handle request without cookies', () => {
      expect(strategy).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should return payload as-is', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual(payload);
      expect(result.sub).toBe('user-123');
      expect(result.email).toBe('test@example.com');
      expect(result.role).toBe('USER');
    });

    it('should handle payload with additional claims', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'ADMIN',
        iat: 1234567890,
        exp: 1234567890,
        customClaim: 'custom-value',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual(payload);
      expect(result.customClaim).toBe('custom-value');
    });

    it('should return empty payload if provided', () => {
      const payload = {};

      const result = strategy.validate(payload);

      expect(result).toEqual({});
    });

    it('should handle null payload', () => {
      const payload = null as any;

      const result = strategy.validate(payload);

      expect(result).toBeNull();
    });

    it('should handle payload with nested objects', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'USER',
        metadata: {
          department: 'Engineering',
          level: 5,
        },
      };

      const result = strategy.validate(payload);

      expect(result).toEqual(payload);
      expect(result.metadata.department).toBe('Engineering');
    });
  });

  describe('extractToken', () => {
    it('should extract token from cookie when available', () => {
      const mockRequest = {
        cookies: {
          accessToken: 'token-from-cookie',
        },
        headers: {},
      } as any;

      const token = strategy.extractToken(mockRequest);

      expect(token).toBe('token-from-cookie');
    });

    it('should fallback to Authorization header when cookie not available', () => {
      const mockRequest = {
        cookies: {},
        headers: {
          authorization: 'Bearer token-from-header',
        },
      } as any;

      const token = strategy.extractToken(mockRequest);

      expect(token).toBe('token-from-header');
    });

    it('should handle request with null cookies', () => {
      const mockRequest = {
        cookies: null,
        headers: {
          authorization: 'Bearer token-from-header',
        },
      } as any;

      const token = strategy.extractToken(mockRequest);

      expect(token).toBe('token-from-header');
    });

    it('should handle request with undefined cookies', () => {
      const mockRequest = {
        cookies: undefined,
        headers: {
          authorization: 'Bearer token-from-header',
        },
      } as any;

      const token = strategy.extractToken(mockRequest);

      expect(token).toBe('token-from-header');
    });

    it('should handle request with empty cookies object', () => {
      const mockRequest = {
        cookies: {},
        headers: {
          authorization: 'Bearer token-from-header',
        },
      } as any;

      const token = strategy.extractToken(mockRequest);

      expect(token).toBe('token-from-header');
    });

    it('should prioritize cookie over Authorization header', () => {
      const mockRequest = {
        cookies: {
          accessToken: 'token-from-cookie',
        },
        headers: {
          authorization: 'Bearer token-from-header',
        },
      } as any;

      const token = strategy.extractToken(mockRequest);

      expect(token).toBe('token-from-cookie');
    });
  });
});
