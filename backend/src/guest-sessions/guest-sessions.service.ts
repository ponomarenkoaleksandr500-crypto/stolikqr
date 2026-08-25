import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { DomainEvents } from '../realtime/domain-events';
import type { GuestSessionDto } from './guest-sessions.types';

@Injectable()
export class GuestSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Idempotent create-or-resume: a reload from the same device at the same
  // table must come back as the SAME session, not a new row every time.
  async createOrResume(
    qrToken: string,
    deviceToken: string,
  ): Promise<GuestSessionDto> {
    const table = await this.prisma.table.findUnique({
      where: { qrToken },
      include: { location: true },
    });
    if (!table) throw new NotFoundException('Unknown table qrToken');

    const existing = await this.prisma.guestSession.findFirst({
      where: { tableId: table.id, deviceToken, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
    if (existing) return this.toDto(existing);

    const created = await this.prisma.guestSession.create({
      data: { tableId: table.id, deviceToken },
    });
    // Only the genuinely-new path counts as a "session started" for
    // analytics (D7) - a reload resuming the same session must not inflate
    // the metric, see AnalyticsService's SESSION_STARTED listener.
    this.eventEmitter.emit(DomainEvents.GUEST_SESSION_STARTED, {
      restaurantId: table.location.restaurantId,
      tableId: table.id,
      guestSessionId: created.id,
    });
    return this.toDto(created);
  }

  async findById(id: string): Promise<GuestSessionDto> {
    const session = await this.prisma.guestSession.findUnique({
      where: { id },
    });
    if (!session) throw new NotFoundException(`Unknown guest session: ${id}`);
    return this.toDto(session);
  }

  private toDto(session: {
    id: string;
    tableId: string;
    startedAt: Date;
  }): GuestSessionDto {
    return {
      id: session.id,
      tableId: session.tableId,
      startedAt: session.startedAt.getTime(),
    };
  }
}
