import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { WaiterCallsService } from '../waiter-calls/waiter-calls.service';
import type { AuthenticatedStaff } from '../auth/auth.types';
import type { StaffOverviewDto, TableFloorStatus } from './staff.types';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly waiterCallsService: WaiterCallsService,
  ) {}

  async getOverview(
    slug: string,
    staff: AuthenticatedStaff,
  ): Promise<StaffOverviewDto> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
    });
    if (!restaurant)
      throw new NotFoundException(`Unknown restaurant slug: ${slug}`);
    if (restaurant.id !== staff.restaurantId) {
      throw new ForbiddenException('Staff does not belong to this restaurant');
    }

    const [tables, activeOrders, activeCalls, unpaidTableIds, recentSessions] =
      await Promise.all([
        this.prisma.table.findMany({
          where: { location: { restaurantId: restaurant.id } },
        }),
        this.ordersService.findActiveForRestaurant(restaurant.id),
        this.waiterCallsService.findActiveForRestaurant(restaurant.id),
        this.ordersService.findUnpaidTableIds(restaurant.id),
        // "Occupied" reads GuestSession the same way orders read visit
        // history elsewhere (OrdersService.findForGuestSession): a session
        // only counts if it started after the table's own last close, since
        // GuestSession has no other lifecycle end (see GuestSessionsService -
        // endedAt is never actually set anywhere yet).
        this.prisma.guestSession.findMany({
          where: { table: { location: { restaurantId: restaurant.id } } },
          select: { tableId: true, startedAt: true },
        }),
      ]);
    // Table codes are free-text (see Table.code), but are numbers in every
    // real case seen so far ("1".."10", ...) - a plain string `orderBy`
    // would put "10" right after "1", ahead of "2".."9". Sort numerically
    // when every code parses as one; fall back to alphabetical only for a
    // restaurant using non-numeric codes (e.g. "VIP", "Patio-2").
    const allNumeric = tables.every((t) => /^\d+$/.test(t.code));
    tables.sort((a, b) =>
      allNumeric
        ? Number(a.code) - Number(b.code)
        : a.code.localeCompare(b.code),
    );

    const tableIdsWithOrder = new Set(activeOrders.map((o) => o.tableId));
    const tableIdsWithCall = new Set(activeCalls.map((c) => c.tableId));
    const tableIdsWithUnpaidOrder = new Set(unpaidTableIds);

    return {
      tables: tables.map((t) => {
        const hasActiveCall = tableIdsWithCall.has(t.id);
        const hasActiveOrder = tableIdsWithOrder.has(t.id);
        const hasUnpaidOrder = tableIdsWithUnpaidOrder.has(t.id);
        const hasGuestSession = recentSessions.some(
          (s) =>
            s.tableId === t.id &&
            (t.lastClosedAt === null || s.startedAt > t.lastClosedAt),
        );

        // Highest-priority state wins: a guest actively flagging staff down
        // matters more than an unpaid bill sitting quietly, which in turn
        // matters more than food still cooking.
        const status: TableFloorStatus = hasActiveCall
          ? 'CALLED_WAITER'
          : hasUnpaidOrder && !hasActiveOrder
            ? 'AWAITING_PAYMENT'
            : hasActiveOrder
              ? 'ORDERED'
              : hasGuestSession
                ? 'OCCUPIED'
                : 'FREE';

        return {
          id: t.id,
          code: t.code,
          label: t.label,
          zone: t.zone,
          status,
          hasActiveOrder,
          hasActiveCall,
        };
      }),
      activeOrders,
      activeCalls,
    };
  }
}
