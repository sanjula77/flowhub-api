import { Injectable } from '@nestjs/common';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => this.extractToken(request),
      ]),
      secretOrKey: process.env.JWT_SECRET || 'secret',
    });
  }

  /**
   * Extract JWT token from request
   * Tries cookie first, then falls back to Authorization header
   * This method is extracted for testability
   */
  extractToken(request: Request): string | null {
    // Try to get token from cookie first
    if (request?.cookies?.accessToken) {
      return request.cookies.accessToken;
    }
    // Fallback to Authorization header
    return ExtractJwt.fromAuthHeaderAsBearerToken()(request);
  }

  validate(payload: any) {
    return payload;
  }
}
