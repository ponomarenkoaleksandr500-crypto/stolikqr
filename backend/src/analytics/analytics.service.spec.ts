import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';
import type { TrackEventDto } from './dto/track-event.dto';
import type { AuthenticatedStaff } from '../auth/auth.types';

const staff: AuthenticatedStaff = {
  id: 'staff-1',
  restaurantId: 'restaurant-1',
  email: 'waiter@demo.stolikqr.app',
  role: 'WAITER',
};

interface GroupByArgs {
  by: string[];
  where: { name?: string };
}
interface GroupByRow {
  name?: string;
  dishId?: string | null;
  _count: { _all: number };
}

function buildMockPrisma() {
  return {
    restaurant: { findUnique: jest.fn() },
    guestSession: { findUnique: jest.fn() },
    dish: { findMany: jest.fn() },
    order: { findMany: jest.fn() },
    analyticsEvent: {
      create: jest.fn(),
      groupBy: jest.fn<Promise<GroupByRow[]>, [GroupByArgs]>(),
      // getSummary counts distinct guest sessions (active today, and those
      // that ordered) rather than SESSION_STARTED events - see the service.
      findMany: jest.fn<
        Promise<{ guestSessionId: string | null }[]>,
        [{ where?: { name?: string } }]
      >(),
    },
  };
}

/** Empty-data defaults for the parts of getSummary this test file isn't exercising. */
function stubEmptyRankings(prisma: ReturnType<typeof buildMockPrisma>) {
  prisma.dish.findMany.mockResolvedValue([]);
  prisma.order.findMany.mockResolvedValue([]);
  prisma.analyticsEvent.findMany.mockResolvedValue([]);
}

/** Distinct-session rows: `active` sessions seen today, `ordering` a subset that ordered. */
function stubSessions(
  prisma: ReturnType<typeof buildMockPrisma>,
  active: number,
  ordering: number,
) {
  const ids = (n: number, prefix: string) =>
    Array.from({ length: n }, (_, i) => ({ guestSessionId: `${prefix}-${i}` }));
  prisma.analyticsEvent.findMany.mockImplementation(({ where }) =>
    Promise.resolve(
      where?.name === 'ORDER_CREATED'
        ? ids(ordering, 'session')
        : ids(active, 'session'),
    ),
  );
}

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: ReturnType<typeof buildMockPrisma>;

  beforeEach(async () => {
    prisma = buildMockPrisma();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(AnalyticsService);
  });

  describe('track', () => {
    const dto: TrackEventDto = {
      name: 'DISH_VIEWED',
      restaurantId: 'restaurant-1',
      guestSessionId: 'session-1',
      dishId: 'dish-1',
    };

    it('records an event and derives tableId from the guest session', async () => {
      prisma.restaurant.findUnique.mockResolvedValue({ id: 'restaurant-1' });
      prisma.guestSession.findUnique.mockResolvedValue({ tableId: 'table-1' });

      await service.track(dto);

      expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: {
          restaurantId: 'restaurant-1',
          tableId: 'table-1',
          guestSessionId: 'session-1',
          dishId: 'dish-1',
          name: 'DISH_VIEWED',
          payload: undefined,
        },
      });
    });

    it('records without a tableId when the guest session is unknown', async () => {
      prisma.restaurant.findUnique.mockResolvedValue({ id: 'restaurant-1' });
      prisma.guestSession.findUnique.mockResolvedValue(null);

      await service.track(dto);

      expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: {
          restaurantId: 'restaurant-1',
          tableId: undefined,
          guestSessionId: 'session-1',
          dishId: 'dish-1',
          name: 'DISH_VIEWED',
          payload: undefined,
        },
      });
    });

    it('rejects an unknown restaurant and writes nothing', async () => {
      prisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(service.track(dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.analyticsEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('domain event listeners', () => {
    it('logs SESSION_STARTED from a guestSession.started event', async () => {
      await service.handleSessionStarted({
        restaurantId: 'restaurant-1',
        tableId: 'table-1',
        guestSessionId: 'session-1',
      });

      expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: {
          restaurantId: 'restaurant-1',
          tableId: 'table-1',
          guestSessionId: 'session-1',
          name: 'SESSION_STARTED',
          payload: undefined,
        },
      });
    });

    it('logs ORDER_CREATED with the order id in payload', async () => {
      await service.handleOrderCreated({
        restaurantId: 'restaurant-1',
        tableId: 'table-1',
        order: { id: 'order-1', guestSessionId: 'session-1' } as never,
      });

      expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: {
          restaurantId: 'restaurant-1',
          tableId: 'table-1',
          guestSessionId: 'session-1',
          name: 'ORDER_CREATED',
          payload: { orderId: 'order-1' },
        },
      });
    });

    it('logs WAITER_CALLED with the reasonKey in payload', async () => {
      await service.handleWaiterCallCreated({
        restaurantId: 'restaurant-1',
        tableId: 'table-1',
        waiterCall: {
          id: 'call-1',
          guestSessionId: 'session-1',
          reasonKey: 'bill',
        } as never,
      });

      expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: {
          restaurantId: 'restaurant-1',
          tableId: 'table-1',
          guestSessionId: 'session-1',
          name: 'WAITER_CALLED',
          payload: { reasonKey: 'bill' },
        },
      });
    });
  });

  describe('getSummary', () => {
    it('computes the daily funnel and conversion rate', async () => {
      prisma.restaurant.findUnique.mockResolvedValue({
        id: 'restaurant-1',
        slug: 'demo-restaurant',
      });
      prisma.analyticsEvent.groupBy.mockImplementation(({ by }) =>
        Promise.resolve(
          by[0] === 'name'
            ? [
                { name: 'SESSION_STARTED', _count: { _all: 47 } },
                { name: 'MENU_OPENED', _count: { _all: 40 } },
                { name: 'DISH_VIEWED', _count: { _all: 130 } },
                { name: 'DISH_ADDED_TO_CART', _count: { _all: 30 } },
                { name: 'ORDER_CREATED', _count: { _all: 19 } },
                { name: 'WAITER_CALLED', _count: { _all: 5 } },
              ]
            : [],
        ),
      );
      stubEmptyRankings(prisma);
      stubSessions(prisma, 47, 19);

      const result = await service.getSummary('demo-restaurant', staff);

      expect(result.qrSessions).toBe(47);
      expect(result.orders).toBe(19);
      expect(result.conversionRate).toBeCloseTo(40.4, 1);
    });

    it('never reports a conversion rate above 100%, even when one session orders repeatedly', async () => {
      prisma.restaurant.findUnique.mockResolvedValue({
        id: 'restaurant-1',
        slug: 'demo-restaurant',
      });
      // The exact shape that produced the reported "2 замовлень з 1 QR-сесій"
      // and a 200% conversion rate: one guest session, two orders.
      prisma.analyticsEvent.groupBy.mockImplementation(({ by }) =>
        Promise.resolve(
          by[0] === 'name'
            ? [{ name: 'ORDER_CREATED', _count: { _all: 2 } }]
            : [],
        ),
      );
      stubEmptyRankings(prisma);
      stubSessions(prisma, 1, 1);

      const result = await service.getSummary('demo-restaurant', staff);

      expect(result.qrSessions).toBe(1);
      expect(result.orders).toBe(2);
      expect(result.conversionRate).toBe(100);
    });

    it('returns 0 conversion when there are no sessions yet', async () => {
      prisma.restaurant.findUnique.mockResolvedValue({
        id: 'restaurant-1',
        slug: 'demo-restaurant',
      });
      prisma.analyticsEvent.groupBy.mockResolvedValue([]);
      stubEmptyRankings(prisma);

      const result = await service.getSummary('demo-restaurant', staff);

      expect(result.conversionRate).toBe(0);
      expect(result.averageOrderValue).toBe(0);
      expect(result.topOrderedDishes).toEqual([]);
      expect(result.topModifiers).toEqual([]);
      expect(result.topViewedDishes).toEqual([]);
    });

    it('ranks top viewed and added-to-cart dishes by name, most first', async () => {
      prisma.restaurant.findUnique.mockResolvedValue({
        id: 'restaurant-1',
        slug: 'demo-restaurant',
      });
      prisma.analyticsEvent.findMany.mockResolvedValue([]);
      prisma.analyticsEvent.groupBy.mockImplementation(({ by, where }) => {
        if (by[0] === 'name') return Promise.resolve([]);
        if (where.name === 'DISH_VIEWED') {
          return Promise.resolve([
            { dishId: 'dish-1', _count: { _all: 3 } },
            { dishId: 'dish-2', _count: { _all: 9 } },
          ]);
        }
        if (where.name === 'DISH_ADDED_TO_CART') {
          return Promise.resolve([{ dishId: 'dish-1', _count: { _all: 2 } }]);
        }
        return Promise.resolve([]);
      });
      prisma.dish.findMany.mockResolvedValue([
        { id: 'dish-1', name: { uk: 'Бургер', en: 'Burger' } },
        { id: 'dish-2', name: { uk: 'Піца', en: 'Pizza' } },
      ]);
      prisma.order.findMany.mockResolvedValue([]);

      const result = await service.getSummary('demo-restaurant', staff);

      expect(result.topViewedDishes).toEqual([
        { name: { uk: 'Піца', en: 'Pizza' }, count: 9 },
        { name: { uk: 'Бургер', en: 'Burger' }, count: 3 },
      ]);
      expect(result.topAddedToCartDishes).toEqual([
        { name: { uk: 'Бургер', en: 'Burger' }, count: 2 },
      ]);
    });

    it('computes average order value and popularity from real today-orders, not analytics pings', async () => {
      prisma.restaurant.findUnique.mockResolvedValue({
        id: 'restaurant-1',
        slug: 'demo-restaurant',
      });
      prisma.analyticsEvent.groupBy.mockResolvedValue([]);
      prisma.analyticsEvent.findMany.mockResolvedValue([]);
      prisma.dish.findMany.mockResolvedValue([]);
      prisma.order.findMany.mockResolvedValue([
        {
          items: [
            {
              dishId: 'dish-1',
              nameSnapshot: { uk: 'Бургер', en: 'Burger' },
              quantity: 2,
              lineTotal: { toNumber: () => 530 },
              modifiersSnapshot: [
                {
                  choiceId: 'choice-bacon',
                  choiceName: { uk: 'Бекон', en: 'Bacon' },
                },
              ],
            },
          ],
        },
        {
          items: [
            {
              dishId: 'dish-1',
              nameSnapshot: { uk: 'Бургер', en: 'Burger' },
              quantity: 1,
              lineTotal: { toNumber: () => 265 },
              modifiersSnapshot: null,
            },
          ],
        },
      ]);

      const result = await service.getSummary('demo-restaurant', staff);

      // (530 + 265) / 2 orders = 397.5
      expect(result.averageOrderValue).toBeCloseTo(397.5, 2);
      expect(result.topOrderedDishes).toEqual([
        { name: { uk: 'Бургер', en: 'Burger' }, count: 3 },
      ]);
      expect(result.topModifiers).toEqual([
        { name: { uk: 'Бекон', en: 'Bacon' }, count: 1 },
      ]);
    });

    it('rejects an unknown restaurant slug', async () => {
      prisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(service.getSummary('nope', staff)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects staff from a different restaurant', async () => {
      prisma.restaurant.findUnique.mockResolvedValue({
        id: 'restaurant-2',
        slug: 'demo-restaurant',
      });

      await expect(
        service.getSummary('demo-restaurant', staff),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
