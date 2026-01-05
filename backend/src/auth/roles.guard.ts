import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../users/user.entity';

/**
 * Roles Decorator
 * Used to specify required roles for a route
 *
 * @example
 * @Roles(UserRole.ADMIN)
 * @Roles(UserRole.ADMIN, UserRole.USER)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);

/**
 * Roles Guard
 * Implements role-based access control (RBAC)
 *
 * Features:
 * - Validates user has required role(s)
 * - Prevents role escalation
 * - Works with JwtAuthGuard
 * - Throws proper HTTP exceptions
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.ADMIN)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from @Roles() decorator
    const requiredRoles = this.reflector.get<UserRole[]>(
      'roles',
      context.getHandler(),
    );

    // If no roles required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // User must be authenticated (JwtAuthGuard should have set this)
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Please ensure JwtAuthGuard is applied before RolesGuard.',
      );
    }

    // Extract user role from request
    // Handle different user object structures (from JWT payload or database)
    const userRole = this.extractUserRole(user);

    // Validate user has a role
    if (!userRole) {
      throw new ForbiddenException('User role not found. Access denied.');
    }

    // Check if user's role is in the required roles list
    const hasRequiredRole = requiredRoles.includes(userRole);

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}. Your role: ${userRole}`,
      );
    }

    // Prevent role escalation: Validate role is valid enum value
    this.validateRole(userRole);

    return true;
  }

  /**
   * Extract user role from request user object
   * Handles different user object structures
   */
  private extractUserRole(user: any): UserRole | null {
    // Try different possible properties
    if (user.role && Object.values(UserRole).includes(user.role)) {
      return user.role as UserRole;
    }

    // Fallback: check roles array
    if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
      const firstRole = user.roles[0];
      if (Object.values(UserRole).includes(firstRole)) {
        return firstRole as UserRole;
      }
    }

    return null;
  }

  /**
   * Validate role is a valid enum value
   * Prevents role escalation attacks
   */
  private validateRole(role: string): void {
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(role as UserRole)) {
      throw new ForbiddenException(
        `Invalid role detected: ${role}. This may indicate a security issue.`,
      );
    }
  }
}
