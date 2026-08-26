import {
  ForbiddenException,
  Injectable,
  type ExecutionContext,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedStaff } from './auth.types';

/**
 * Protects Admin App-only REST endpoints. Runs the same JWT check as
 * JwtAuthGuard, then additionally requires role === 'ADMIN' - a valid staff
 * token from a WAITER account authenticates fine elsewhere but is refused
 * here.
 */
@Injectable()
export class AdminGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = await super.canActivate(context);
    if (!authenticated) return false;

    const request = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedStaff }>();
    if (request.user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
