import {
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../users/user.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let context: ExecutionContext;

  const mockReflector = {
    get: jest.fn(),
  };

  const createMockContext = (
    user: any,
    handler: any = {},
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
      getHandler: () => handler,
    } as ExecutionContext;
  };

  beforeEach(() => {
    reflector = mockReflector as any;
    guard = new RolesGuard(reflector);
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access if no roles required', () => {
      mockReflector.get.mockReturnValue(null);
      const user = { role: UserRole.USER };
      context = createMockContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access if user has required role', () => {
      mockReflector.get.mockReturnValue([UserRole.ADMIN]);
      const user = { role: UserRole.ADMIN };
      context = createMockContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access if user does not have required role', () => {
      mockReflector.get.mockReturnValue([UserRole.ADMIN]);
      const user = { role: UserRole.USER };
      context = createMockContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow access if user has one of multiple required roles', () => {
      mockReflector.get.mockReturnValue([UserRole.ADMIN, UserRole.USER]);
      const user = { role: UserRole.USER };
      context = createMockContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException if user not found', () => {
      mockReflector.get.mockReturnValue([UserRole.ADMIN]);
      context = createMockContext(null);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException if user has no role', () => {
      mockReflector.get.mockReturnValue([UserRole.ADMIN]);
      const user = {}; // No role property
      context = createMockContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for invalid role', () => {
      mockReflector.get.mockReturnValue([UserRole.ADMIN]);
      const user = { role: 'INVALID_ROLE' };
      context = createMockContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should extract role from roles array if role property not found', () => {
      mockReflector.get.mockReturnValue([UserRole.ADMIN]);
      const user = { roles: [UserRole.ADMIN, UserRole.USER] };
      context = createMockContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should use first role from roles array', () => {
      mockReflector.get.mockReturnValue([UserRole.USER]);
      const user = { roles: [UserRole.USER, UserRole.ADMIN] };
      context = createMockContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException if roles array contains invalid role', () => {
      mockReflector.get.mockReturnValue([UserRole.ADMIN]);
      const user = { roles: ['INVALID_ROLE'] };
      context = createMockContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should validate role is in enum values', () => {
      mockReflector.get.mockReturnValue([UserRole.ADMIN]);
      const user = { role: UserRole.ADMIN };
      context = createMockContext(user);

      const result = guard.canActivate(context);

      // validateRole is called internally and should pass for valid enum values
      expect(result).toBe(true);
    });

    it('should allow access with empty roles array when no roles required', () => {
      mockReflector.get.mockReturnValue(null);
      const user = { roles: [] };
      context = createMockContext(user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should call validateRole for valid roles', () => {
      mockReflector.get.mockReturnValue([UserRole.ADMIN]);
      const user = { role: UserRole.ADMIN };
      context = createMockContext(user);

      // validateRole is called internally after role check
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when validateRole detects invalid role', () => {
      // To test validateRole's error path, we need:
      // 1. extractUserRole to return an invalid role (via spy)
      // 2. requiredRoles to include that invalid role (so hasRequiredRole passes)
      // 3. validateRole should then catch the invalid role
      const invalidRole = 'INVALID_ROLE_VALUE';
      mockReflector.get.mockReturnValue([UserRole.ADMIN, invalidRole as any]);
      const user = { role: invalidRole };
      context = createMockContext(user);

      // Mock extractUserRole to return the invalid role (bypassing its enum check)
      const extractUserRoleSpy = jest.spyOn(guard as any, 'extractUserRole');
      extractUserRoleSpy.mockReturnValue(invalidRole);

      // Now: hasRequiredRole will pass (invalidRole is in requiredRoles)
      // But validateRole will fail (invalidRole is not in enum)
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Invalid role detected');

      extractUserRoleSpy.mockRestore();
    });
  });
});
