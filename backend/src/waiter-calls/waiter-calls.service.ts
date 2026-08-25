import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWaiterCallDto } from './dto/create-waiter-call.dto';
import type { WaiterCallStatusValue } from './dto/update-waiter-call-status.dto';
import type { WaiterCallDto } from './waiter-calls.types';
import type { $Enums } from '../../generated/prisma/client';
import { DomainEvents } from '../realtime/domain-events';
import type { AuthenticatedStaff } from '../auth/auth.types';

// PENDING/ACCEPTED/IN_PROGRESS all count as "there's already something for
// staff to act on for this table" - COMPLETED is the only inactive state.
const ACTIVE_STATUSES: $Enums.WaiterCallStatus[] = [
  'PENDING',
  'ACCEPTED',
  'IN_PROGRESS',
];

// One-directional lifecycle, no skipping and no going back - matches the D4
// spec exactly: PENDING -> ACCEPTED -> IN_PROGRESS -> COMPLETED.
const ALLOWED_TRANSITIONS: Record<string, WaiterCallStatusValue[]> = {
  PENDING: ['ACCEPTED'],
  ACCEPTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
};

interface WaiterCallRecord {
  id: string;
  tableId: string;
  guestSessionId: string | null;
  reasonKey: string;
  status: string;
  calledAt: Date;
  acceptedAt: Date | null;
  inProgressAt: Date | null;
  completedAt: Date | null;
}

@Injectable()
export class WaiterCallsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Idempotent by design: a table can only ever have one active call. If one
   * already exists this returns it as-is (the new reasonKey is dropped, and
   * no event fires - nothing actually changed) - the client-side guard (the
   * Guest App only shows the reason picker when there's no active call)
   * makes this the rare/defensive path, not the norm.
   */
  async create(dto: CreateWaiterCallDto): Promise<WaiterCallDto> {
    const session = await this.prisma.guestSession.findUnique({
      where: { id: dto.guestSessionId },
      include: { table: { include: { location: true } } },
    });
    if (!session)
      throw new NotFoundException(
        `Unknown guest session: ${dto.guestSessionId}`,
      );

    const existing = await this.prisma.waiterCall.findFirst({
      where: { tableId: session.tableId, status: { in: ACTIVE_STATUSES } },
      orderBy: { calledAt: 'desc' },
    });
    if (existing) return this.toDto(existing);

    const created = await this.prisma.waiterCall.create({
      data: {
        tableId: session.tableId,
        guestSessionId: session.id,
        reasonKey: dto.reasonKey,
        status: 'PENDING',
      },
    });
    const dtoResult = this.toDto(created);
    this.eventEmitter.emit(DomainEvents.WAITER_CALL_CREATED, {
      restaurantId: session.table.location.restaurantId,
      tableId: session.tableId,
      waiterCall: dtoResult,
    });
    return dtoResult;
  }

  /** Staff-only read model: every not-yet-COMPLETED call across the restaurant. */
  async findActiveForRestaurant(
    restaurantId: string,
  ): Promise<WaiterCallDto[]> {
    const calls = await this.prisma.waiterCall.findMany({
      where: {
        status: { in: ACTIVE_STATUSES },
        table: { location: { restaurantId } },
      },
      orderBy: { calledAt: 'asc' },
    });
    return calls.map((call) => this.toDto(call));
  }

  async findActiveForGuestSession(
    guestSessionId: string,
  ): Promise<WaiterCallDto | null> {
    const session = await this.prisma.guestSession.findUnique({
      where: { id: guestSessionId },
    });
    if (!session)
      throw new NotFoundException(`Unknown guest session: ${guestSessionId}`);

    const active = await this.prisma.waiterCall.findFirst({
      where: { tableId: session.tableId, status: { in: ACTIVE_STATUSES } },
      orderBy: { calledAt: 'desc' },
    });
    return active ? this.toDto(active) : null;
  }

  async findById(id: string): Promise<WaiterCallDto> {
    const call = await this.prisma.waiterCall.findUnique({ where: { id } });
    if (!call) throw new NotFoundException(`Unknown waiter call: ${id}`);
    return this.toDto(call);
  }

  async updateStatus(
    id: string,
    nextStatus: WaiterCallStatusValue,
    staff: AuthenticatedStaff,
  ): Promise<WaiterCallDto> {
    const call = await this.prisma.waiterCall.findUnique({
      where: { id },
      include: { table: { include: { location: true } } },
    });
    if (!call) throw new NotFoundException(`Unknown waiter call: ${id}`);
    if (call.table.location.restaurantId !== staff.restaurantId) {
      throw new ForbiddenException(
        'This call belongs to a different restaurant',
      );
    }

    const allowed = ALLOWED_TRANSITIONS[call.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `Cannot transition waiter call from ${call.status} to ${nextStatus}`,
      );
    }

    const timestampField =
      nextStatus === 'ACCEPTED'
        ? 'acceptedAt'
        : nextStatus === 'IN_PROGRESS'
          ? 'inProgressAt'
          : nextStatus === 'COMPLETED'
            ? 'completedAt'
            : null;

    const updated = await this.prisma.waiterCall.update({
      where: { id },
      data: {
        status: nextStatus,
        staffUserId: staff.id,
        ...(timestampField ? { [timestampField]: new Date() } : {}),
      },
    });
    const dtoResult = this.toDto(updated);
    this.eventEmitter.emit(DomainEvents.WAITER_CALL_STATUS_UPDATED, {
      restaurantId: call.table.location.restaurantId,
      tableId: call.tableId,
      waiterCall: dtoResult,
    });
    return dtoResult;
  }

  private toDto(call: WaiterCallRecord): WaiterCallDto {
    return {
      id: call.id,
      tableId: call.tableId,
      guestSessionId: call.guestSessionId,
      reasonKey: call.reasonKey,
      status: call.status,
      calledAt: call.calledAt.getTime(),
      acceptedAt: call.acceptedAt?.getTime() ?? null,
      inProgressAt: call.inProgressAt?.getTime() ?? null,
      completedAt: call.completedAt?.getTime() ?? null,
    };
  }
}
