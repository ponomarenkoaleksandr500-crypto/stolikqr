import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_PROVIDER } from './payment-provider';
import { PaymentsService } from './payments.service';
import type { AuthenticatedStaff } from '../auth/auth.types';

const session = {
  id: 'session-1',
  tableId: 'table-1',
  deviceToken: 'd',
  startedAt: new Date(),
  endedAt: null,
  table: { location: { restaurantId: 'restaurant-1' } },
};

const staff: AuthenticatedStaff = {
  id: 'staff-1',
  restaurantId: 'restaurant-1',
  email: 'waiter@demo.stolikqr.app',
  role: 'WAITER',
};

function orderWithItems(lineTotal: number, paidAt: Date | null = null) {
  return {
    id: `order-${Math.random()}`,
    tableId: 'table-1',
    paidAt,
    items: [{ lineTotal: { toNumber: () => lineTotal } }],
  };
}

function paymentRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'payment-1',
    tableId: 'table-1',
    provider: 'MOCK',
    providerRef: 'ref-1',
    amount: { toNumber: () => 300 },
    status: 'PENDING',
    createdAt: new Date(),
    confirmedAt: null,
    table: { location: { restaurantId: 'restaurant-1' } },
    ...overrides,
  };
}

function buildMockPrisma() {
  return {
    guestSession: { findUnique: jest.fn() },
    // The staff entry point resolves the table directly: a waiter-placed
    // order has no guest session to resolve it from (DEC-005).
    table: { findUnique: jest.fn() },
    order: {
      findMany: jest.fn(),
      updateMany: jest.fn<
        Promise<{ count: number }>,
        [
          {
            where: { tableId: string; paidAt: unknown };
            data: { paidAt: Date | null };
          },
        ]
      >(),
    },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn<
        Promise<unknown>,
        [{ where: { id: string }; data: { status: string } }]
      >(),
    },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: ReturnType<typeof buildMockPrisma>;
  let eventEmitter: { emit: jest.Mock };
  let mockProvider: {
    mode: string;
    createPaymentIntent: jest.Mock;
    refund: jest.Mock;
  };

  beforeEach(async () => {
    prisma = buildMockPrisma();
    eventEmitter = { emit: jest.fn() };
    // A provider must declare its mode: the service records it on every
    // payment row so a stub settlement is never indistinguishable from a
    // real one (DEC-006).
    mockProvider = {
      mode: 'DEMO',
      createPaymentIntent: jest.fn(),
      refund: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: PAYMENT_PROVIDER, useValue: mockProvider },
      ],
    }).compile();
    service = moduleRef.get(PaymentsService);
  });

  describe('create', () => {
    it('sums every unpaid order and starts a provider intent', async () => {
      prisma.guestSession.findUnique.mockResolvedValue(session);
      prisma.order.findMany.mockResolvedValue([
        orderWithItems(150),
        orderWithItems(90),
      ]);
      prisma.payment.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({
            ...paymentRecord(),
            ...data,
            amount: { toNumber: () => data.amount as number },
          }),
      );

      const result = await service.create('session-1');

      expect(result.amount).toBe(240);
      expect(result.status).toBe('PENDING');
      expect(mockProvider.createPaymentIntent).toHaveBeenCalledWith(
        expect.any(String),
        false,
      );
    });

    it('rejects a table with nothing unpaid', async () => {
      prisma.guestSession.findUnique.mockResolvedValue(session);
      prisma.order.findMany.mockResolvedValue([]);

      await expect(service.create('session-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('rejects an unknown guest session', async () => {
      prisma.guestSession.findUnique.mockResolvedValue(null);

      await expect(service.create('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns the existing PENDING payment instead of starting a second one', async () => {
      prisma.guestSession.findUnique.mockResolvedValue(session);
      prisma.payment.findFirst.mockResolvedValue(
        paymentRecord({ id: 'already-pending' }),
      );

      const result = await service.create('session-1');

      expect(result.id).toBe('already-pending');
      expect(prisma.order.findMany).not.toHaveBeenCalled();
      expect(prisma.payment.create).not.toHaveBeenCalled();
      expect(mockProvider.createPaymentIntent).not.toHaveBeenCalled();
    });

    it('starts a fresh payment when the existing PENDING one is stale (orphaned by a restart)', async () => {
      prisma.guestSession.findUnique.mockResolvedValue(session);
      prisma.payment.findFirst.mockResolvedValue(
        paymentRecord({
          id: 'orphaned-pending',
          createdAt: new Date(Date.now() - 60_000), // well past the stub provider's 8s delay
        }),
      );
      prisma.order.findMany.mockResolvedValue([orderWithItems(150)]);
      prisma.payment.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({
            ...paymentRecord(),
            ...data,
            amount: { toNumber: () => data.amount as number },
          }),
      );

      const result = await service.create('session-1');

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'orphaned-pending' },
        data: { status: 'FAILED' },
      });
      expect(result.id).not.toBe('orphaned-pending');
      expect(result.amount).toBe(150);
      expect(mockProvider.createPaymentIntent).toHaveBeenCalledWith(
        expect.any(String),
        false,
      );
    });

    it('routes guest self-checkout through the provider, not around it', async () => {
      prisma.guestSession.findUnique.mockResolvedValue(session);
      prisma.order.findMany.mockResolvedValue([orderWithItems(240)]);

      // One row the mocks share, so an update is visible to the read that
      // follows it — the service re-reads the row the provider just settled,
      // and a mock that always returns the original would hide that.
      let row: Record<string, unknown> | null = null;
      prisma.payment.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => {
          row = {
            ...paymentRecord(),
            ...data,
            amount: { toNumber: () => data.amount as number },
          };
          return Promise.resolve(row);
        },
      );
      prisma.payment.findUnique.mockImplementation(() => Promise.resolve(row));
      prisma.payment.update.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => {
          row = { ...(row as object), ...data };
          return Promise.resolve(row);
        },
      );
      prisma.order.updateMany.mockResolvedValue({ count: 1 });

      // The provider drives settlement now, so the stub must do what the real
      // one does: tell the service it settled. Previously the service called
      // settle() itself and the provider was bypassed entirely (DEC-006).
      mockProvider.createPaymentIntent.mockImplementation(
        async (providerRef: string, immediate: boolean) => {
          if (immediate) await service.handleProviderSettled({ providerRef });
        },
      );

      const result = await service.create('session-1', 'CARD');

      expect((row as unknown as { provider: string }).provider).toBe('CARD');
      expect((row as unknown as { mode: string }).mode).toBe('DEMO');
      expect(result.status).toBe('SUCCEEDED');
      expect(result.mode).toBe('DEMO');
      expect(mockProvider.createPaymentIntent).toHaveBeenCalledWith(
        expect.any(String),
        true,
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'payment.status.updated',
        expect.objectContaining({ tableId: 'table-1' }),
      );
    });
  });

  // BUG-001: a waiter-placed order has no guest session, so the guest entry
  // point could not reach it and the table could never be settled or closed.
  // DEC-006: a stub settlement must never be indistinguishable from a real
  // one. These lock the two properties that guarantee it.
  describe('payment mode (DEC-006)', () => {
    it("records the provider's mode on the row, rather than inferring it later", async () => {
      prisma.guestSession.findUnique.mockResolvedValue(session);
      prisma.order.findMany.mockResolvedValue([orderWithItems(100)]);
      let created: Record<string, unknown> = {};
      prisma.payment.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => {
          created = data;
          return Promise.resolve({
            ...paymentRecord(),
            ...data,
            amount: { toNumber: () => data.amount as number },
          });
        },
      );

      const result = await service.create('session-1');

      expect(created.mode).toBe('DEMO');
      expect(result.mode).toBe('DEMO');
    });

    it("carries a live provider's mode through unchanged", async () => {
      mockProvider.mode = 'LIVE';
      prisma.guestSession.findUnique.mockResolvedValue(session);
      prisma.order.findMany.mockResolvedValue([orderWithItems(100)]);
      let created: Record<string, unknown> = {};
      prisma.payment.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) => {
          created = data;
          return Promise.resolve({
            ...paymentRecord(),
            ...data,
            amount: { toNumber: () => data.amount as number },
          });
        },
      );

      await service.create('session-1');

      // The service must not hardcode DEMO anywhere: swapping the provider
      // is the only thing that should change what a row claims.
      expect(created.mode).toBe('LIVE');
    });

    it('never settles without going through the provider', async () => {
      prisma.guestSession.findUnique.mockResolvedValue(session);
      prisma.order.findMany.mockResolvedValue([orderWithItems(100)]);
      prisma.payment.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({
            ...paymentRecord(),
            ...data,
            amount: { toNumber: () => data.amount as number },
          }),
      );

      const result = await service.create('session-1');

      expect(mockProvider.createPaymentIntent).toHaveBeenCalledTimes(1);
      // The stub here does nothing, so nothing settled it — the row must
      // still be PENDING. A service that settled on its own would show
      // SUCCEEDED and that is exactly the bypass DEC-006 removed.
      expect(result.status).toBe('PENDING');
    });
  });

  describe('handleProviderSettled', () => {
    it('marks the payment SUCCEEDED and pays off every unpaid order at the table', async () => {
      prisma.payment.findUnique.mockResolvedValue(
        paymentRecord({ status: 'PENDING' }),
      );
      prisma.payment.update.mockResolvedValue(
        paymentRecord({ status: 'SUCCEEDED', confirmedAt: new Date() }),
      );
      prisma.order.updateMany.mockResolvedValue({ count: 2 });

      await service.handleProviderSettled({ providerRef: 'ref-1' });

      const paymentUpdateArgs = prisma.payment.update.mock.calls[0][0];
      expect(paymentUpdateArgs.data.status).toBe('SUCCEEDED');

      const orderUpdateArgs = prisma.order.updateMany.mock.calls[0][0];
      expect(orderUpdateArgs.where).toEqual({
        tableId: 'table-1',
        paidAt: null,
      });
      expect(orderUpdateArgs.data.paidAt).toBeInstanceOf(Date);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'payment.status.updated',
        expect.objectContaining({
          restaurantId: 'restaurant-1',
          tableId: 'table-1',
        }),
      );
    });

    it('writes paidMode equal to the payment mode, in the same update call as paidAt', async () => {
      prisma.payment.findUnique.mockResolvedValue(
        paymentRecord({ status: 'PENDING', mode: 'DEMO' }),
      );
      prisma.payment.update.mockResolvedValue(
        paymentRecord({ status: 'SUCCEEDED', confirmedAt: new Date() }),
      );
      prisma.order.updateMany.mockResolvedValue({ count: 1 });

      await service.handleProviderSettled({ providerRef: 'ref-1' });

      const orderUpdateArgs = prisma.order.updateMany.mock.calls[0][0] as {
        where: { tableId: string; paidAt: unknown };
        data: { paidAt: Date; paidMode: string };
      };
      expect(orderUpdateArgs.data.paidAt).toBeInstanceOf(Date);
      expect(orderUpdateArgs.data.paidMode).toBe('DEMO');
      // Verify they are in the same data object (one call, not two)
      expect(Object.keys(orderUpdateArgs.data)).toContain('paidAt');
      expect(Object.keys(orderUpdateArgs.data)).toContain('paidMode');
    });

    it('is a no-op for an unknown providerRef', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await service.handleProviderSettled({ providerRef: 'nope' });

      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('is idempotent - ignores a payment that already settled', async () => {
      prisma.payment.findUnique.mockResolvedValue(
        paymentRecord({ status: 'SUCCEEDED' }),
      );

      await service.handleProviderSettled({ providerRef: 'ref-1' });

      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('refund', () => {
    it('refunds a succeeded payment and clears paidAt', async () => {
      prisma.payment.findUnique.mockResolvedValue(
        paymentRecord({ status: 'SUCCEEDED' }),
      );
      prisma.payment.update.mockResolvedValue(
        paymentRecord({ status: 'REFUNDED' }),
      );
      prisma.order.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.refund('payment-1', staff);

      expect(result.status).toBe('REFUNDED');
      expect(mockProvider.refund).toHaveBeenCalledWith('ref-1');
      expect(prisma.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { paidAt: null, paidMode: null },
        }),
      );
    });

    it('rejects refunding a payment that never succeeded', async () => {
      prisma.payment.findUnique.mockResolvedValue(
        paymentRecord({ status: 'PENDING' }),
      );

      await expect(service.refund('payment-1', staff)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects staff from a different restaurant', async () => {
      prisma.payment.findUnique.mockResolvedValue(
        paymentRecord({ status: 'SUCCEEDED' }),
      );
      const otherStaff: AuthenticatedStaff = {
        ...staff,
        restaurantId: 'restaurant-2',
      };

      await expect(
        service.refund('payment-1', otherStaff),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an unknown payment', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.refund('nope', staff)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findLatestForGuestSession', () => {
    it('returns null when the table has never been billed', async () => {
      prisma.guestSession.findUnique.mockResolvedValue(session);
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        service.findLatestForGuestSession('session-1'),
      ).resolves.toBeNull();
    });
  });
});
