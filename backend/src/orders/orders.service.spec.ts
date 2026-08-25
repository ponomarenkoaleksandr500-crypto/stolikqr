import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from './orders.service';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { AuthenticatedStaff } from '../auth/auth.types';

const session = {
  id: 'session-1',
  tableId: 'table-1',
  deviceToken: 'device-1',
  startedAt: new Date(),
  endedAt: null,
  table: { location: { restaurantId: 'restaurant-1' } },
};

const staff: AuthenticatedStaff = {
  id: 'staff-1',
  restaurantId: 'restaurant-1',
  email: 'waiter@demo.stolikqr.app',
};

const dish = {
  id: 'dish-1',
  slug: 'classic-burger',
  name: { uk: 'Бургер Класичний', en: 'Classic Burger' },
  price: { toNumber: () => 210 },
  emoji: '🍔',
  gradient: 'from-amber-400 to-rose-500',
  modifierGroups: [
    {
      id: 'group-doneness',
      name: { uk: 'Ступінь прожарки', en: 'Doneness' },
      sortOrder: 0,
      choices: [
        {
          id: 'choice-medium',
          name: { uk: 'Medium', en: 'Medium' },
          priceDelta: { toNumber: () => 0 },
          sortOrder: 0,
        },
      ],
    },
    {
      id: 'group-extras',
      name: { uk: 'Додатки', en: 'Extras' },
      sortOrder: 1,
      choices: [
        {
          id: 'choice-bacon',
          name: { uk: 'Бекон', en: 'Bacon' },
          priceDelta: { toNumber: () => 35 },
          sortOrder: 0,
        },
      ],
    },
  ],
  ingredients: [{ id: 'ing-onion', name: { uk: 'цибуля', en: 'onion' } }],
};

function buildMockPrisma() {
  const tx = {
    order: {
      create: jest.fn(
        ({
          data,
        }: {
          data: {
            tableId: string;
            guestSessionId: string | null;
            status: string;
            items: { create: Record<string, unknown>[] };
          };
        }) => ({
          id: 'order-1',
          tableId: data.tableId,
          guestSessionId: data.guestSessionId,
          status: data.status,
          createdAt: new Date(),
          paidAt: null,
          items: data.items.create.map((item, index) => ({
            id: `order-item-${index}`,
            createdAt: new Date(),
            ...item,
            // Real Prisma returns Decimal objects for Decimal columns, not
            // plain numbers - simulate that so toOrderDto's .toNumber() calls
            // exercise the same code path as against a real database.
            basePriceSnapshot: {
              toNumber: () => item.basePriceSnapshot as number,
            },
            lineTotal: { toNumber: () => item.lineTotal as number },
          })),
        }),
      ),
    },
  };

  return {
    guestSession: { findUnique: jest.fn() },
    dish: { findUnique: jest.fn() },
    order: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    $transaction: jest.fn<Promise<unknown>, [(tx: unknown) => unknown]>((cb) =>
      Promise.resolve(cb(tx)),
    ),
    __tx: tx,
  };
}

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: ReturnType<typeof buildMockPrisma>;

  beforeEach(async () => {
    prisma = buildMockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(OrdersService);
  });

  const baseDto: CreateOrderDto = {
    guestSessionId: 'session-1',
    items: [
      { dishId: 'dish-1', quantity: 2, modifierChoiceIds: ['choice-bacon'] },
    ],
  };

  it('creates an order with a server-computed price, ignoring anything the client sent', async () => {
    prisma.guestSession.findUnique.mockResolvedValue(session);
    prisma.dish.findUnique.mockResolvedValue(dish);

    // Simulates a tampered request: a client that also sent its own price/lineTotal.
    // CreateOrderItemDto has no such field at all, so this can only reach the
    // service via a bypass of the DTO type - if it were honored, this test
    // would catch it.
    const tamperedDto = {
      guestSessionId: 'session-1',
      items: [
        {
          dishId: 'dish-1',
          quantity: 2,
          modifierChoiceIds: ['choice-bacon'],
          unitPrice: 1,
          lineTotal: 1,
        } as unknown as CreateOrderDto['items'][number],
      ],
    };

    const result = await service.create(tamperedDto);

    // (210 base + 35 bacon) * 2 = 490 - server-computed, not the injected 1.
    expect(result.items[0].lineTotal).toBe(490);
    expect(result.items[0].basePrice).toBe(210);
    expect(result.items[0].modifiers).toEqual([
      {
        groupId: 'group-extras',
        groupName: { uk: 'Додатки', en: 'Extras' },
        choiceId: 'choice-bacon',
        choiceName: { uk: 'Бекон', en: 'Bacon' },
        priceDelta: 35,
      },
    ]);
    expect(result.tableId).toBe('table-1');
    expect(result.status).toBe('NEW');
    expect(prisma.__tx.order.create).toHaveBeenCalledTimes(1);
  });

  it('rejects an unknown guest session', async () => {
    prisma.guestSession.findUnique.mockResolvedValue(null);

    await expect(service.create(baseDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.dish.findUnique).not.toHaveBeenCalled();
    expect(prisma.__tx.order.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown dish', async () => {
    prisma.guestSession.findUnique.mockResolvedValue(session);
    prisma.dish.findUnique.mockResolvedValue(null);

    await expect(service.create(baseDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.__tx.order.create).not.toHaveBeenCalled();
  });

  it('rejects a modifier choice that does not belong to the dish', async () => {
    prisma.guestSession.findUnique.mockResolvedValue(session);
    prisma.dish.findUnique.mockResolvedValue(dish);

    const dto: CreateOrderDto = {
      guestSessionId: 'session-1',
      items: [
        {
          dishId: 'dish-1',
          quantity: 1,
          modifierChoiceIds: ['choice-does-not-exist'],
        },
      ],
    };

    await expect(service.create(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.__tx.order.create).not.toHaveBeenCalled();
  });

  it('rejects an excluded ingredient that does not belong to the dish', async () => {
    prisma.guestSession.findUnique.mockResolvedValue(session);
    prisma.dish.findUnique.mockResolvedValue(dish);

    const dto: CreateOrderDto = {
      guestSessionId: 'session-1',
      items: [
        {
          dishId: 'dish-1',
          quantity: 1,
          excludedIngredientIds: ['ing-does-not-exist'],
        },
      ],
    };

    await expect(service.create(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.__tx.order.create).not.toHaveBeenCalled();
  });

  it('never leaves a partial write when the transaction fails (atomicity)', async () => {
    prisma.guestSession.findUnique.mockResolvedValue(session);
    prisma.dish.findUnique.mockResolvedValue(dish);
    prisma.$transaction.mockRejectedValue(
      new Error('simulated DB failure mid-transaction'),
    );

    await expect(service.create(baseDto)).rejects.toThrow(
      'simulated DB failure mid-transaction',
    );
    // The service has exactly one write path (the $transaction callback) - if
    // it rejects, nothing was committed. There is no separate, non-transactional
    // order.create/orderItem.create call anywhere else in the service that
    // could have already run.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  describe('updateStatus', () => {
    function orderRecord(status: string) {
      return {
        id: 'order-1',
        tableId: 'table-1',
        guestSessionId: 'session-1',
        status,
        createdAt: new Date(),
        paidAt: null,
        items: [],
        table: { location: { restaurantId: 'restaurant-1' } },
      };
    }

    it.each([
      ['NEW', 'ACCEPTED', true],
      ['ACCEPTED', 'PREPARING', true],
      ['PREPARING', 'READY', true],
      ['READY', 'SERVED', true],
      ['NEW', 'PREPARING', false], // skipping a step
      ['ACCEPTED', 'NEW', false], // going backward
      ['SERVED', 'ACCEPTED', false], // reopening a served order
    ] as const)(
      'transition %s -> %s is allowed=%s',
      async (from, to, allowed) => {
        prisma.order.findUnique.mockResolvedValue(orderRecord(from));
        prisma.order.update.mockResolvedValue({
          ...orderRecord(to),
          status: to,
        });

        if (allowed) {
          await expect(
            service.updateStatus('order-1', to, staff),
          ).resolves.toMatchObject({
            status: to,
          });
        } else {
          await expect(
            service.updateStatus('order-1', to, staff),
          ).rejects.toBeInstanceOf(BadRequestException);
          expect(prisma.order.update).not.toHaveBeenCalled();
        }
      },
    );

    it('rejects staff from a different restaurant', async () => {
      prisma.order.findUnique.mockResolvedValue(orderRecord('NEW'));
      const otherStaff: AuthenticatedStaff = {
        ...staff,
        restaurantId: 'restaurant-2',
      };

      await expect(
        service.updateStatus('order-1', 'ACCEPTED', otherStaff),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('rejects an unknown order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('nope', 'ACCEPTED', staff),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findActiveForRestaurant', () => {
    it('queries orders scoped to the restaurant, excluding SERVED', async () => {
      prisma.order.findMany.mockResolvedValue([]);

      await service.findActiveForRestaurant('restaurant-1');

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: { not: 'SERVED' },
            table: { location: { restaurantId: 'restaurant-1' } },
          },
        }),
      );
    });
  });
});
