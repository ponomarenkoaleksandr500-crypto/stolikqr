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
  role: 'WAITER',
};

const dish = {
  id: 'dish-1',
  slug: 'classic-burger',
  name: { uk: 'Бургер Класичний', en: 'Classic Burger' },
  price: { toNumber: () => 210 },
  emoji: '🍔',
  gradient: 'from-amber-400 to-rose-500',
  isAvailable: true,
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
    order: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    orderItem: { updateMany: jest.fn() },
    // create() uses the callback form ($transaction(async (tx) => ...));
    // updateStatus() uses the array form ($transaction([p1, p2])), same as
    // PaymentsService's mock - support both here rather than forcing one
    // style on every caller.
    $transaction: jest.fn(
      (arg: ((txClient: typeof tx) => unknown) | Promise<unknown>[]) =>
        Array.isArray(arg) ? Promise.all(arg) : Promise.resolve(arg(tx)),
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

  it('rejects a dish that is no longer available', async () => {
    prisma.guestSession.findUnique.mockResolvedValue(session);
    prisma.dish.findUnique.mockResolvedValue({ ...dish, isAvailable: false });

    await expect(service.create(baseDto)).rejects.toBeInstanceOf(
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

    it('cascades the new status to every item on the order, not just the order row', async () => {
      prisma.order.findUnique.mockResolvedValue(orderRecord('NEW'));
      prisma.order.update.mockResolvedValue({
        ...orderRecord('ACCEPTED'),
        status: 'ACCEPTED',
      });

      await service.updateStatus('order-1', 'ACCEPTED', staff);

      // Regression: the Guest App reads each OrderItem's own status column
      // (see OrdersService.toOrderDto) to render kitchen progress - if this
      // isn't cascaded, a guest keeps seeing "kitchen received your order"
      // no matter how far staff advances the order.
      expect(prisma.orderItem.updateMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
        data: { status: 'ACCEPTED' },
      });
    });

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

  describe('reorder', () => {
    function lastOrderItem(overrides: Partial<Record<string, unknown>> = {}) {
      return {
        dishId: 'dish-1',
        nameSnapshot: dish.name,
        quantity: 2,
        modifiersSnapshot: [
          {
            groupId: 'group-extras',
            groupName: dish.modifierGroups[1].name,
            choiceId: 'choice-bacon',
            choiceName: dish.modifierGroups[1].choices[0].name,
            priceDelta: 35,
          },
        ],
        excludedIngredientsSnapshot: [],
        ...overrides,
      };
    }

    it('repeats every item with a freshly computed price, ignoring the old one', async () => {
      prisma.guestSession.findUnique.mockResolvedValue(session);
      prisma.order.findFirst.mockResolvedValue({
        items: [lastOrderItem()],
      });
      prisma.dish.findUnique.mockResolvedValue(dish);

      const result = await service.reorder('session-1');

      expect(result.skippedItems).toEqual([]);
      expect(result.order?.items[0].lineTotal).toBe(490); // (210 + 35) * 2, recomputed
      expect(prisma.__tx.order.create).toHaveBeenCalledTimes(1);
    });

    it('skips an item whose dish was deleted, but still places the rest', async () => {
      prisma.guestSession.findUnique.mockResolvedValue(session);
      prisma.order.findFirst.mockResolvedValue({
        items: [
          lastOrderItem({ dishId: 'dish-deleted', modifiersSnapshot: [] }),
          lastOrderItem(),
        ],
      });
      prisma.dish.findUnique.mockImplementation(
        ({ where }: { where: { id: string } }) =>
          Promise.resolve(where.id === 'dish-1' ? dish : null),
      );

      const result = await service.reorder('session-1');

      expect(result.skippedItems).toEqual([
        { name: dish.name, quantity: 2, reason: 'NOT_FOUND' },
      ]);
      expect(result.order?.items).toHaveLength(1);
    });

    it('skips an item whose dish became unavailable', async () => {
      prisma.guestSession.findUnique.mockResolvedValue(session);
      prisma.order.findFirst.mockResolvedValue({
        items: [lastOrderItem({ modifiersSnapshot: [] })],
      });
      prisma.dish.findUnique.mockResolvedValue({
        ...dish,
        isAvailable: false,
      });

      const result = await service.reorder('session-1');

      expect(result.order).toBeNull();
      expect(result.skippedItems).toEqual([
        { name: dish.name, quantity: 2, reason: 'UNAVAILABLE' },
      ]);
      expect(prisma.__tx.order.create).not.toHaveBeenCalled();
    });

    it('skips an item whose modifier choice no longer exists on the dish', async () => {
      prisma.guestSession.findUnique.mockResolvedValue(session);
      prisma.order.findFirst.mockResolvedValue({
        items: [
          lastOrderItem({
            modifiersSnapshot: [
              {
                groupId: 'group-extras',
                groupName: dish.modifierGroups[1].name,
                choiceId: 'choice-removed',
                choiceName: { uk: 'Видалено', en: 'Removed' },
                priceDelta: 20,
              },
            ],
          }),
        ],
      });
      prisma.dish.findUnique.mockResolvedValue(dish);

      const result = await service.reorder('session-1');

      expect(result.order).toBeNull();
      expect(result.skippedItems).toEqual([
        { name: dish.name, quantity: 2, reason: 'OPTIONS_CHANGED' },
      ]);
    });

    it('rejects an unknown guest session', async () => {
      prisma.guestSession.findUnique.mockResolvedValue(null);

      await expect(service.reorder('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects a table with no previous order to repeat', async () => {
      prisma.guestSession.findUnique.mockResolvedValue(session);
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(service.reorder('session-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
