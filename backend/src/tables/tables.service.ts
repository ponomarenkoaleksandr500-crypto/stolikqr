import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { DomainEvents } from '../realtime/domain-events';
import type { AuthenticatedStaff } from '../auth/auth.types';
import type { $Enums } from '../../generated/prisma/client';

// Same ACTIVE_STATUSES set as WaiterCallsService - duplicated rather than
// imported since it's a tiny, stable domain constant and importing across
// feature modules for one array isn't worth the coupling.
const ACTIVE_CALL_STATUSES: $Enums.WaiterCallStatus[] = [
  'PENDING',
  'ACCEPTED',
  'IN_PROGRESS',
];

export interface CloseTableResultDto {
  id: string;
  closedAt: number;
}

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Translates today's URL shape (/r/[slug]/t/[tableCode]) into the table's
  // qrToken. This is the one place the client-visible slug+code pair is used;
  // everything downstream (menu, guest session) is keyed by qrToken alone.
  // Once real QR provisioning encodes the qrToken directly in the printed
  // code's URL, this lookup becomes unnecessary.
  async resolveBySlugAndCode(
    slug: string,
    code: string,
  ): Promise<{ tableId: string; qrToken: string }> {
    const table = await this.prisma.table.findFirst({
      where: { code, location: { restaurant: { slug } } },
    });
    if (!table)
      throw new NotFoundException(
        `No table "${code}" for restaurant "${slug}"`,
      );
    return { tableId: table.id, qrToken: table.qrToken };
  }

  /**
   * "Close table": old guests left, staff is resetting it for whoever sits
   * down next. Sets Table.lastClosedAt, which OrdersService then uses as
   * the boundary of "this visit" - orders/reorder history from before it
   * stay in the database (for analytics/audit) but stop being shown to or
   * reused by future guests at this table.
   *
   * Refuses to close while there's still something staff or the previous
   * guests haven't resolved (an unpaid order, an active waiter call) -
   * closing over those would silently hide them from view rather than
   * actually resolving them.
   */
  async close(
    tableId: string,
    staff: AuthenticatedStaff,
  ): Promise<CloseTableResultDto> {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      include: { location: true },
    });
    if (!table) throw new NotFoundException(`Unknown table: ${tableId}`);
    if (table.location.restaurantId !== staff.restaurantId) {
      throw new ForbiddenException(
        'This table belongs to a different restaurant',
      );
    }

    const [unpaidOrder, activeCall] = await Promise.all([
      this.prisma.order.findFirst({
        where: { tableId, paidAt: null },
        select: { id: true },
      }),
      this.prisma.waiterCall.findFirst({
        where: { tableId, status: { in: ACTIVE_CALL_STATUSES } },
        select: { id: true },
      }),
    ]);
    if (unpaidOrder) {
      throw new BadRequestException(
        'This table still has an unpaid order - settle it before closing',
      );
    }
    if (activeCall) {
      throw new BadRequestException(
        'This table still has an active waiter call - resolve it before closing',
      );
    }

    const closedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.table.update({
        where: { id: tableId },
        data: { lastClosedAt: closedAt },
      }),
      /*
       * Closing the table ends the visit, so it must end the guest sessions
       * on it. GuestSession.endedAt existed but was never written by
       * anything, and GuestSessionsService.createOrResume resumes ANY
       * session with endedAt = null - so a phone that had scanned this
       * table before got its old session back, complete with its old
       * startedAt. getOverview only counts a session that started after the
       * table's last close, so those guests stayed invisible: the floor plan
       * showed FREE while people sat there.
       *
       * Ending the sessions here makes the next scan create a genuinely new
       * one, which is what the rest of the logic already expects.
       */
      this.prisma.guestSession.updateMany({
        where: { tableId, endedAt: null },
        data: { endedAt: closedAt },
      }),
    ]);

    this.eventEmitter.emit(DomainEvents.TABLE_CLOSED, {
      restaurantId: table.location.restaurantId,
      tableId,
      closedAt: closedAt.getTime(),
    });

    return { id: tableId, closedAt: closedAt.getTime() };
  }
}
