import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { MockPaymentProvider } from './mock-payment-provider';
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
  let mockProvider: { createPaymentIntent: jest.Mock; refund: jest.Mock };

  beforeEach(async () => {
    prisma = buildMockPrisma();
    eventEmitter = { emit: jest.fn() };
    mockProvider = { createPaymentIntent: jest.fn(), refund: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: MockPaymentProvider, useValue: mockProvider },
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
          createdAt: new Date(Date.now() - 60_000), // well past MockPaymentProvider's 8s delay
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
      );
    });

    it('settles instantly (no provider intent) when the guest picks a self-checkout method', async () => {
      prisma.guestSession.findUnique.mockResolvedValue(session);
      prisma.order.findMany.mockResolvedValue([orderWithItems(240)]);
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
      prisma.payment.findUnique.mockImplementation(() =>
        Promise.resolve(paymentRecord({ ...created, status: 'PENDING' })),
      );
      prisma.payment.update.mockResolvedValue(
        paymentRecord({
          ...created,
          status: 'SUCCEEDED',
          confirmedAt: new Date(),
        }),
      );
      prisma.order.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.create('session-1', 'CARD');

      expect(created.provider).toBe('CARD');
      expect(result.status).toBe('SUCCEEDED');
      // The stub settles inline, unlike the "bring the bill" flow - no
      // async provider intent, no waiting on MockPaymentProvider's timer.
      expect(mockProvider.createPaymentIntent).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'payment.status.updated',
        expect.objectContaining({ tableId: 'table-1' }),
      );
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
