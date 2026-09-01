import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { WaiterCallsService } from '../waiter-calls/waiter-calls.service';
import { StaffService } from './staff.service';
import type { AuthenticatedStaff } from '../auth/auth.types';

const staff: AuthenticatedStaff = {
  id: 'staff-1',
  restaurantId: 'restaurant-1',
  email: 'waiter@demo.stolikqr.app',
  role: 'WAITER',
};

function table(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'table-1',
    code: '1',
    label: null,
    zone: null,
    lastClosedAt: null as Date | null,
    ...overrides,
  };
}

function buildMockPrisma() {
  return {
    restaurant: { findUnique: jest.fn() },
    table: { findMany: jest.fn() },
    guestSession: { findMany: jest.fn() },
  };
}

describe('StaffService', () => {
  let service: StaffService;
  let prisma: ReturnType<typeof buildMockPrisma>;
  let ordersService: {
    findActiveForRestaurant: jest.Mock;
    findUnpaidOrderRows: jest.Mock;
  };
  let waiterCallsService: { findActiveForRestaurant: jest.Mock };

  beforeEach(async () => {
    prisma = buildMockPrisma();
    ordersService = {
      findActiveForRestaurant: jest.fn().mockResolvedValue([]),
      findUnpaidOrderRows: jest.fn().mockResolvedValue([]),
    };
    waiterCallsService = {
      findActiveForRestaurant: jest.fn().mockResolvedValue([]),
    };
    prisma.restaurant.findUnique.mockResolvedValue({
      id: 'restaurant-1',
      slug: 'demo',
    });
    prisma.guestSession.findMany.mockResolvedValue([]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrdersService, useValue: ordersService },
        { provide: WaiterCallsService, useValue: waiterCallsService },
      ],
    }).compile();
    service = moduleRef.get(StaffService);
  });

  describe('getOverview - table status priority', () => {
    it('is FREE with no orders, calls, or guest sessions', async () => {
      prisma.table.findMany.mockResolvedValue([table()]);

      const result = await service.getOverview('demo', staff);

      expect(result.tables[0].status).toBe('FREE');
    });

    it('is OCCUPIED when a guest session started after the table was last closed', async () => {
      prisma.table.findMany.mockResolvedValue([table()]);
      prisma.guestSession.findMany.mockResolvedValue([
        { tableId: 'table-1', startedAt: new Date() },
      ]);

      const result = await service.getOverview('demo', staff);

      expect(result.tables[0].status).toBe('OCCUPIED');
    });

    it('ignores a guest session from before the table was last closed', async () => {
      prisma.table.findMany.mockResolvedValue([
        table({ lastClosedAt: new Date() }),
      ]);
      prisma.guestSession.findMany.mockResolvedValue([
        { tableId: 'table-1', startedAt: new Date(Date.now() - 60_000) },
      ]);

      const result = await service.getOverview('demo', staff);

      expect(result.tables[0].status).toBe('FREE');
    });

    it('is ORDERED when the table has an active (not-yet-served) order', async () => {
      prisma.table.findMany.mockResolvedValue([table()]);
      ordersService.findActiveForRestaurant.mockResolvedValue([
        { tableId: 'table-1', createdAt: 2_000 },
      ]);

      const result = await service.getOverview('demo', staff);

      expect(result.tables[0].status).toBe('ORDERED');
      expect(result.tables[0].hasActiveOrder).toBe(true);
    });

    it('is AWAITING_PAYMENT when everything is served but unpaid', async () => {
      prisma.table.findMany.mockResolvedValue([table()]);
      ordersService.findUnpaidOrderRows.mockResolvedValue([
        { tableId: 'table-1', createdAt: new Date(1_000) },
      ]);
      // Nothing in findActiveForRestaurant - the order is SERVED, so it
      // dropped out of the "still cooking/serving" set.

      const result = await service.getOverview('demo', staff);

      expect(result.tables[0].status).toBe('AWAITING_PAYMENT');
    });

    it('prefers ORDERED over AWAITING_PAYMENT when one batch is served-unpaid and another is still cooking', async () => {
      prisma.table.findMany.mockResolvedValue([table()]);
      ordersService.findActiveForRestaurant.mockResolvedValue([
        { tableId: 'table-1', createdAt: 2_000 },
      ]);
      ordersService.findUnpaidOrderRows.mockResolvedValue([
        { tableId: 'table-1', createdAt: new Date(1_000) },
      ]);

      const result = await service.getOverview('demo', staff);

      expect(result.tables[0].status).toBe('ORDERED');
    });

    it('goes back to FREE after the table is closed, even if an old order was never served', async () => {
      // The reported "столи не закриваються": closing a table only stamps
      // lastClosedAt, so an order the guest paid for up front and the
      // kitchen never advanced past NEW kept the table on ORDERED forever.
      prisma.table.findMany.mockResolvedValue([
        table({ lastClosedAt: new Date(5_000) }),
      ]);
      ordersService.findActiveForRestaurant.mockResolvedValue([
        { tableId: 'table-1', createdAt: 2_000 },
      ]);
      ordersService.findUnpaidOrderRows.mockResolvedValue([
        { tableId: 'table-1', createdAt: new Date(2_000) },
      ]);

      const result = await service.getOverview('demo', staff);

      expect(result.tables[0].status).toBe('FREE');
      expect(result.tables[0].hasActiveOrder).toBe(false);
    });

    it('still reports an order placed AFTER the last close', async () => {
      prisma.table.findMany.mockResolvedValue([
        table({ lastClosedAt: new Date(5_000) }),
      ]);
      ordersService.findActiveForRestaurant.mockResolvedValue([
        { tableId: 'table-1', createdAt: 9_000 },
      ]);

      const result = await service.getOverview('demo', staff);

      expect(result.tables[0].status).toBe('ORDERED');
    });

    it('prefers CALLED_WAITER over every other state', async () => {
      prisma.table.findMany.mockResolvedValue([table()]);
      ordersService.findActiveForRestaurant.mockResolvedValue([
        { tableId: 'table-1', createdAt: 2_000 },
      ]);
      ordersService.findUnpaidOrderRows.mockResolvedValue([
        { tableId: 'table-1', createdAt: new Date(1_000) },
      ]);
      waiterCallsService.findActiveForRestaurant.mockResolvedValue([
        { tableId: 'table-1', createdAt: 2_000 },
      ]);

      const result = await service.getOverview('demo', staff);

      expect(result.tables[0].status).toBe('CALLED_WAITER');
      expect(result.tables[0].hasActiveCall).toBe(true);
    });
  });

  it('rejects staff from a different restaurant', async () => {
    prisma.restaurant.findUnique.mockResolvedValue({
      id: 'restaurant-2',
      slug: 'demo',
    });
    prisma.table.findMany.mockResolvedValue([]);

    await expect(service.getOverview('demo', staff)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects an unknown restaurant slug', async () => {
    prisma.restaurant.findUnique.mockResolvedValue(null);

    await expect(service.getOverview('nope', staff)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
