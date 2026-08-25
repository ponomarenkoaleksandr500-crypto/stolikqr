import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { WaiterCallsService } from './waiter-calls.service';
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
};

function buildMockPrisma() {
  return {
    guestSession: { findUnique: jest.fn() },
    waiterCall: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

function callRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'call-1',
    tableId: 'table-1',
    guestSessionId: 'session-1',
    reasonKey: 'help',
    status: 'PENDING',
    calledAt: new Date(),
    acceptedAt: null,
    inProgressAt: null,
    completedAt: null,
    table: { location: { restaurantId: 'restaurant-1' } },
    ...overrides,
  };
}

describe('WaiterCallsService', () => {
  let service: WaiterCallsService;
  let prisma: ReturnType<typeof buildMockPrisma>;

  beforeEach(async () => {
    prisma = buildMockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        WaiterCallsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(WaiterCallsService);
  });

  it('creates a new PENDING call when the table has no active one', async () => {
    prisma.guestSession.findUnique.mockResolvedValue(session);
    prisma.waiterCall.findFirst.mockResolvedValue(null);
    prisma.waiterCall.create.mockResolvedValue(callRecord());

    const result = await service.create({
      guestSessionId: 'session-1',
      reasonKey: 'help',
    });

    expect(result.status).toBe('PENDING');
    expect(prisma.waiterCall.create).toHaveBeenCalledWith({
      data: {
        tableId: 'table-1',
        guestSessionId: 'session-1',
        reasonKey: 'help',
        status: 'PENDING',
      },
    });
  });

  it('returns the existing active call instead of creating a second one', async () => {
    prisma.guestSession.findUnique.mockResolvedValue(session);
    prisma.waiterCall.findFirst.mockResolvedValue(
      callRecord({
        id: 'existing-call',
        reasonKey: 'water',
        status: 'ACCEPTED',
      }),
    );

    const result = await service.create({
      guestSessionId: 'session-1',
      reasonKey: 'bill',
    });

    expect(result.id).toBe('existing-call');
    expect(result.reasonKey).toBe('water'); // the new reasonKey ("bill") is dropped
    expect(prisma.waiterCall.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown guest session', async () => {
    prisma.guestSession.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ guestSessionId: 'nope', reasonKey: 'help' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns null when the table has no active call', async () => {
    prisma.guestSession.findUnique.mockResolvedValue(session);
    prisma.waiterCall.findFirst.mockResolvedValue(null);

    await expect(
      service.findActiveForGuestSession('session-1'),
    ).resolves.toBeNull();
  });

  describe('updateStatus', () => {
    it.each([
      ['PENDING', 'ACCEPTED', true],
      ['ACCEPTED', 'IN_PROGRESS', true],
      ['IN_PROGRESS', 'COMPLETED', true],
      ['PENDING', 'IN_PROGRESS', false], // skipping a step
      ['ACCEPTED', 'PENDING', false], // going backward
      ['COMPLETED', 'ACCEPTED', false], // reopening a completed call
    ] as const)(
      'transition %s -> %s is allowed=%s',
      async (from, to, allowed) => {
        prisma.waiterCall.findUnique.mockResolvedValue(
          callRecord({ status: from }),
        );
        prisma.waiterCall.update.mockResolvedValue(callRecord({ status: to }));

        if (allowed) {
          await expect(
            service.updateStatus('call-1', to, staff),
          ).resolves.toMatchObject({
            status: to,
          });
        } else {
          await expect(
            service.updateStatus('call-1', to, staff),
          ).rejects.toBeInstanceOf(BadRequestException);
          expect(prisma.waiterCall.update).not.toHaveBeenCalled();
        }
      },
    );

    it('rejects staff from a different restaurant', async () => {
      prisma.waiterCall.findUnique.mockResolvedValue(
        callRecord({ status: 'PENDING' }),
      );
      const otherStaff: AuthenticatedStaff = {
        ...staff,
        restaurantId: 'restaurant-2',
      };

      await expect(
        service.updateStatus('call-1', 'ACCEPTED', otherStaff),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.waiterCall.update).not.toHaveBeenCalled();
    });

    it('rejects a status update for an unknown call', async () => {
      prisma.waiterCall.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('nope', 'ACCEPTED', staff),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findActiveForRestaurant', () => {
    it('queries calls scoped to the restaurant, only active statuses', async () => {
      prisma.waiterCall.findMany.mockResolvedValue([]);

      await service.findActiveForRestaurant('restaurant-1');

      expect(prisma.waiterCall.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
            table: { location: { restaurantId: 'restaurant-1' } },
          },
        }),
      );
    });
  });
});
