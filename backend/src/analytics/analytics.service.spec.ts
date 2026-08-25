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
};

function buildMockPrisma() {
  return {
    restaurant: { findUnique: jest.fn() },
    guestSession: { findUnique: jest.fn() },
    analyticsEvent: {
      create: jest.fn(),
      groupBy: jest.fn<
        Promise<{ name: string; _count: { _all: number } }[]>,
        [unknown]
      >(),
    },
  };
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
      prisma.analyticsEvent.groupBy.mockResolvedValue([
        { name: 'SESSION_STARTED', _count: { _all: 47 } },
        { name: 'MENU_OPENED', _count: { _all: 40 } },
        { name: 'DISH_VIEWED', _count: { _all: 130 } },
        { name: 'DISH_ADDED_TO_CART', _count: { _all: 30 } },
        { name: 'ORDER_CREATED', _count: { _all: 19 } },
        { name: 'WAITER_CALLED', _count: { _all: 5 } },
      ]);

      const result = await service.getSummary('demo-restaurant', staff);

      expect(result.qrSessions).toBe(47);
      expect(result.orders).toBe(19);
      expect(result.conversionRate).toBeCloseTo(40.4, 1);
    });

    it('returns 0 conversion when there are no sessions yet', async () => {
      prisma.restaurant.findUnique.mockResolvedValue({
        id: 'restaurant-1',
        slug: 'demo-restaurant',
      });
      prisma.analyticsEvent.groupBy.mockResolvedValue([]);

      const result = await service.getSummary('demo-restaurant', staff);

      expect(result.conversionRate).toBe(0);
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
