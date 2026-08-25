import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { WaiterCallsService } from '../waiter-calls/waiter-calls.service';
import type { AuthenticatedStaff } from '../auth/auth.types';
import type { StaffOverviewDto } from './staff.types';

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

    const [tables, activeOrders, activeCalls] = await Promise.all([
      this.prisma.table.findMany({
        where: { location: { restaurantId: restaurant.id } },
        orderBy: { code: 'asc' },
      }),
      this.ordersService.findActiveForRestaurant(restaurant.id),
      this.waiterCallsService.findActiveForRestaurant(restaurant.id),
    ]);

    const tableIdsWithOrder = new Set(activeOrders.map((o) => o.tableId));
    const tableIdsWithCall = new Set(activeCalls.map((c) => c.tableId));

    return {
      tables: tables.map((t) => ({
        id: t.id,
        code: t.code,
        label: t.label,
        hasActiveOrder: tableIdsWithOrder.has(t.id),
        hasActiveCall: tableIdsWithCall.has(t.id),
      })),
      activeOrders,
      activeCalls,
    };
  }
}
