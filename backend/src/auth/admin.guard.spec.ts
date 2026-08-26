import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedStaff } from './auth.types';

function contextWithUser(
  user: AuthenticatedStaff | undefined,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows an authenticated ADMIN through', async () => {
    jest.spyOn(JwtAuthGuard.prototype, 'canActivate').mockResolvedValue(true);
    const context = contextWithUser({
      id: 'staff-1',
      restaurantId: 'restaurant-1',
      email: 'admin@demo.stolikqr.app',
      role: 'ADMIN',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects an authenticated WAITER', async () => {
    jest.spyOn(JwtAuthGuard.prototype, 'canActivate').mockResolvedValue(true);
    const context = contextWithUser({
      id: 'staff-2',
      restaurantId: 'restaurant-1',
      email: 'waiter@demo.stolikqr.app',
      role: 'WAITER',
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('short-circuits when the underlying JWT check itself fails', async () => {
    jest.spyOn(JwtAuthGuard.prototype, 'canActivate').mockResolvedValue(false);
    const context = contextWithUser(undefined);

    await expect(guard.canActivate(context)).resolves.toBe(false);
  });
});
