import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protects staff-only REST endpoints - use on any route only the Waiter App should reach. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
