import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import {
  DomainEvents,
  type GuestSessionEvent,
  type OrderEvent,
  type WaiterCallEvent,
} from '../realtime/domain-events';
import type { AuthenticatedStaff } from '../auth/auth.types';
import type { TrackEventDto } from './dto/track-event.dto';
import type { AnalyticsSummaryDto } from './analytics.types';

// Server-known events, logged from the domain events the owning services
// already emit rather than trusted from a client ping (see track-event.dto.ts).
const SESSION_STARTED = 'SESSION_STARTED';
const ORDER_CREATED = 'ORDER_CREATED';
const WAITER_CALLED = 'WAITER_CALLED';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public ingestion for Guest App behavior pings (POST /analytics/events). */
  async track(dto: TrackEventDto): Promise<void> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId },
      select: { id: true },
    });
    if (!restaurant) {
      throw new NotFoundException(`Unknown restaurant: ${dto.restaurantId}`);
    }

    // The client never legitimately knows the real backend Table.id (see
    // TrackEventDto) - derive it from the guest session instead, when one is
    // given. A stale/unknown guestSessionId (e.g. an ended session still
    // cached client-side) just means the event is recorded without a table,
    // not an error - this endpoint is best-effort by design.
    let tableId: string | undefined;
    if (dto.guestSessionId) {
      const session = await this.prisma.guestSession.findUnique({
        where: { id: dto.guestSessionId },
        select: { tableId: true },
      });
      tableId = session?.tableId;
    }

    await this.prisma.analyticsEvent.create({
      data: {
        restaurantId: dto.restaurantId,
        tableId,
        guestSessionId: dto.guestSessionId,
        dishId: dto.dishId,
        name: dto.name,
        // `nest build`'s tsconfig resolves the generated Prisma client's
        // JsonValue type more strictly than plain tsc does (same JSON-field
        // quirk OrdersService works around with its snapshot fields) - the
        // cast is a no-op at runtime.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        payload: dto.payload as unknown as object | undefined,
      },
    });
  }

  @OnEvent(DomainEvents.GUEST_SESSION_STARTED)
  async handleSessionStarted({
    restaurantId,
    tableId,
    guestSessionId,
  }: GuestSessionEvent): Promise<void> {
    await this.recordServerEvent(SESSION_STARTED, {
      restaurantId,
      tableId,
      guestSessionId,
    });
  }

  @OnEvent(DomainEvents.ORDER_CREATED)
  async handleOrderCreated({
    restaurantId,
    tableId,
    order,
  }: OrderEvent): Promise<void> {
    await this.recordServerEvent(ORDER_CREATED, {
      restaurantId,
      tableId,
      guestSessionId: order.guestSessionId ?? undefined,
      payload: { orderId: order.id },
    });
  }

  @OnEvent(DomainEvents.WAITER_CALL_CREATED)
  async handleWaiterCallCreated({
    restaurantId,
    tableId,
    waiterCall,
  }: WaiterCallEvent): Promise<void> {
    await this.recordServerEvent(WAITER_CALLED, {
      restaurantId,
      tableId,
      guestSessionId: waiterCall.guestSessionId ?? undefined,
      payload: { reasonKey: waiterCall.reasonKey },
    });
  }

  /** Staff-only daily funnel for the restaurant's dashboard. */
  async getSummary(
    slug: string,
    staff: AuthenticatedStaff,
  ): Promise<AnalyticsSummaryDto> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
    });
    if (!restaurant)
      throw new NotFoundException(`Unknown restaurant slug: ${slug}`);
    if (restaurant.id !== staff.restaurantId) {
      throw new ForbiddenException('Staff does not belong to this restaurant');
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const counts = await this.prisma.analyticsEvent.groupBy({
      by: ['name'],
      where: { restaurantId: restaurant.id, occurredAt: { gte: startOfToday } },
      _count: { _all: true },
    });
    const countByName = new Map(counts.map((c) => [c.name, c._count._all]));
    const get = (name: string) => countByName.get(name) ?? 0;

    const qrSessions = get(SESSION_STARTED);
    const orders = get(ORDER_CREATED);

    return {
      qrSessions,
      menuViews: get('MENU_OPENED'),
      categoryViews: get('CATEGORY_VIEWED'),
      dishViews: get('DISH_VIEWED'),
      addToCart: get('DISH_ADDED_TO_CART'),
      orders,
      waiterCalls: get(WAITER_CALLED),
      conversionRate:
        qrSessions > 0 ? Math.round((orders / qrSessions) * 1000) / 10 : 0,
    };
  }

  private async recordServerEvent(
    name: string,
    data: {
      restaurantId: string;
      tableId?: string;
      guestSessionId?: string;
      payload?: object;
    },
  ): Promise<void> {
    await this.prisma.analyticsEvent.create({
      data: {
        restaurantId: data.restaurantId,
        tableId: data.tableId,
        guestSessionId: data.guestSessionId,
        name,
        payload: data.payload,
      },
    });
  }
}
