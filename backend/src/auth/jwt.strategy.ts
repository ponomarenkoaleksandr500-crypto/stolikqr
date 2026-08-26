import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedStaff, JwtPayload } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    if (!process.env.JWT_SECRET) {
      throw new Error(
        'JWT_SECRET is not set - staff auth cannot start without it',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  // Runs only after passport-jwt has already verified the token's signature
  // and expiry - the payload here is trusted.
  validate(payload: JwtPayload): AuthenticatedStaff {
    return {
      id: payload.sub,
      restaurantId: payload.restaurantId,
      email: payload.email,
      role: payload.role,
    };
  }
}
