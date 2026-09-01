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
import type {
  AnalyticsSummaryDto,
  LocalizedText,
  RankedStatDto,
} from './analytics.types';

const TOP_N = 5;

interface ModifierSnapshotEntry {
  choiceId: string;
  choiceName: LocalizedText;
}

function asLocalized(value: unknown): LocalizedText {
  return value as LocalizedText;
}

/** Tallies occurrences by id, resolves each to a display name, sorts desc, keeps the top N. */
function topN(
  countById: Map<string, number>,
  nameById: Map<string, LocalizedText>,
): RankedStatDto[] {
  return [...countById.entries()]
    .map(([id, count]) => ({ name: nameById.get(id), count }))
    .filter((row): row is RankedStatDto => row.name !== undefined)
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_N);
}

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

    /*
     * qrSessions used to be the count of SESSION_STARTED events. That event
     * only fires when a genuinely new GuestSession row is created, and
     * createOrResume() reuses any session with endedAt = null - so a table
     * whose session was opened yesterday and never closed produced orders
     * today against zero sessions today. The dashboard showed things like
     * "2 замовлень з 1 QR-сесій" and a 200% conversion rate, which is how
     * this was noticed.
     *
     * Counting the distinct guest sessions that were actually active today
     * matches what "QR-сесії" means to a restaurant owner, and it puts the
     * conversion numerator and denominator in the same population.
     */
    const [activeSessions, convertedSessions] = await Promise.all([
      this.prisma.analyticsEvent.findMany({
        where: {
          restaurantId: restaurant.id,
          occurredAt: { gte: startOfToday },
          guestSessionId: { not: null },
        },
        select: { guestSessionId: true },
        distinct: ['guestSessionId'],
      }),
      this.prisma.analyticsEvent.findMany({
        where: {
          restaurantId: restaurant.id,
          name: ORDER_CREATED,
          occurredAt: { gte: startOfToday },
          guestSessionId: { not: null },
        },
        select: { guestSessionId: true },
        distinct: ['guestSessionId'],
      }),
    ]);

    const qrSessions = activeSessions.length;
    const orders = get(ORDER_CREATED);
    // Sessions that ordered, not orders placed: one table ordering twice is
    // one converted guest, so this can never exceed 100%.
    const orderingSessions = convertedSessions.length;

    const [topViewedDishes, topAddedToCartDishes, orderStats] =
      await Promise.all([
        this.rankDishesByEvent(restaurant.id, 'DISH_VIEWED', startOfToday),
        this.rankDishesByEvent(
          restaurant.id,
          'DISH_ADDED_TO_CART',
          startOfToday,
        ),
        this.computeOrderStats(restaurant.id, startOfToday),
      ]);

    return {
      qrSessions,
      menuViews: get('MENU_OPENED'),
      categoryViews: get('CATEGORY_VIEWED'),
      dishViews: get('DISH_VIEWED'),
      addToCart: get('DISH_ADDED_TO_CART'),
      orders,
      waiterCalls: get(WAITER_CALLED),
      conversionRate:
        qrSessions > 0
          ? Math.round((orderingSessions / qrSessions) * 1000) / 10
          : 0,
      topViewedDishes,
      topAddedToCartDishes,
      ...orderStats,
    };
  }

  /** Ranks dishes by how many CLIENT_TRACKABLE_EVENT_NAMES events they got today (see analytics.types.ts). */
  private async rankDishesByEvent(
    restaurantId: string,
    eventName: string,
    since: Date,
  ): Promise<RankedStatDto[]> {
    const grouped = await this.prisma.analyticsEvent.groupBy({
      by: ['dishId'],
      where: {
        restaurantId,
        name: eventName,
        occurredAt: { gte: since },
        dishId: { not: null },
      },
      _count: { _all: true },
    });
    if (grouped.length === 0) return [];

    const countById = new Map(
      grouped.map((g) => [g.dishId as string, g._count._all]),
    );
    const dishes = await this.prisma.dish.findMany({
      where: { id: { in: [...countById.keys()] } },
      select: { id: true, name: true },
    });
    const nameById = new Map(dishes.map((d) => [d.id, asLocalized(d.name)]));
    return topN(countById, nameById);
  }

  /**
   * Derives average order value, dish popularity, and modifier popularity
   * from today's real Order/OrderItem rows - not from analytics pings, since
   * an actual placed order (with its immutable snapshot fields) is a more
   * reliable signal than a possibly-abandoned cart-add event, and it's the
   * only source that has modifier choices at all.
   */
  private async computeOrderStats(
    restaurantId: string,
    since: Date,
  ): Promise<
    Pick<
      AnalyticsSummaryDto,
      'averageOrderValue' | 'topOrderedDishes' | 'topModifiers'
    >
  > {
    const orders = await this.prisma.order.findMany({
      where: {
        table: { location: { restaurantId } },
        createdAt: { gte: since },
      },
      include: { items: true },
    });

    let revenue = 0;
    const orderedCountById = new Map<string, number>();
    const orderedNameById = new Map<string, LocalizedText>();
    const modifierCountById = new Map<string, number>();
    const modifierNameById = new Map<string, LocalizedText>();

    for (const order of orders) {
      for (const item of order.items) {
        revenue += item.lineTotal.toNumber();
        orderedCountById.set(
          item.dishId,
          (orderedCountById.get(item.dishId) ?? 0) + item.quantity,
        );
        orderedNameById.set(item.dishId, asLocalized(item.nameSnapshot));

        const modifiers =
          (item.modifiersSnapshot as ModifierSnapshotEntry[] | null) ?? [];
        for (const modifier of modifiers) {
          modifierCountById.set(
            modifier.choiceId,
            (modifierCountById.get(modifier.choiceId) ?? 0) + 1,
          );
          modifierNameById.set(modifier.choiceId, modifier.choiceName);
        }
      }
    }

    return {
      averageOrderValue:
        orders.length > 0
          ? Math.round((revenue / orders.length) * 100) / 100
          : 0,
      topOrderedDishes: topN(orderedCountById, orderedNameById),
      topModifiers: topN(modifierCountById, modifierNameById),
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
