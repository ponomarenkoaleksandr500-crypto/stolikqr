import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';
import { TablesService } from './tables.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedStaff } from '../auth/auth.types';

const staff: AuthenticatedStaff = {
  id: 'staff-1',
  email: 'waiter@demo.stolikqr.app',
  restaurantId: 'restaurant-1',
  role: 'WAITER',
};

function buildMockPrisma() {
  return {
    table: { findUnique: jest.fn(), update: jest.fn() },
    order: { findFirst: jest.fn().mockResolvedValue(null) },
    waiterCall: { findFirst: jest.fn().mockResolvedValue(null) },
    guestSession: { updateMany: jest.fn() },
    $transaction: jest.fn().mockResolvedValue([]),
  };
}

describe('TablesService.close', () => {
  let service: TablesService;
  let prisma: ReturnType<typeof buildMockPrisma>;

  beforeEach(async () => {
    prisma = buildMockPrisma();
    prisma.table.findUnique.mockResolvedValue({
      id: 'table-1',
      location: { restaurantId: 'restaurant-1' },
    });
    const moduleRef = await Test.createTestingModule({
      providers: [
        TablesService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(TablesService);
  });

  /*
   * The bug this guards against, seen in production: a table with guests
   * sitting at it showed FREE on the floor plan.
   *
   * Closing a table only stamped Table.lastClosedAt. GuestSession.endedAt
   * was never written by anything, and createOrResume() resumes ANY session
   * with endedAt = null - so a phone that had scanned this table before got
   * its OLD session back, keeping its old startedAt. StaffService.getOverview
   * only counts a session that started after the last close, so those guests
   * stayed invisible indefinitely.
   */
  it('ends the guest sessions on the table, so a returning device starts a new visit', async () => {
    await service.close('table-1', staff);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.guestSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tableId: 'table-1', endedAt: null },
        data: expect.objectContaining({ endedAt: expect.any(Date) }),
      }),
    );
  });

  it('stamps lastClosedAt in the same transaction as ending the sessions', async () => {
    await service.close('table-1', staff);

    expect(prisma.table.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'table-1' },
        data: expect.objectContaining({ lastClosedAt: expect.any(Date) }),
      }),
    );
  });

  it('refuses to close - and ends nothing - while an order is unpaid', async () => {
    prisma.order.findFirst.mockResolvedValue({ id: 'order-1' });

    await expect(service.close('table-1', staff)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.guestSession.updateMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
