import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MockPaymentProvider } from './mock-payment-provider';
import {
  PAYMENT_PROVIDER_SETTLED,
  type PaymentDto,
  type PaymentProviderSettledEvent,
} from './payments.types';
import { DomainEvents } from '../realtime/domain-events';
import type { AuthenticatedStaff } from '../auth/auth.types';

interface PaymentRecord {
  id: string;
  tableId: string;
  provider: string;
  amount: { toNumber(): number };
  status: string;
  createdAt: Date;
  confirmedAt: Date | null;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly mockProvider: MockPaymentProvider,
  ) {}

  /**
   * Requests payment for the table's current open tab: every order at this
   * table that isn't paid yet, summed. One Payment covers potentially several
   * Order rows (see OrdersService - one submission round = one Order), not
   * just the order that happened to trigger the "bring the bill" action.
   */
  async create(guestSessionId: string): Promise<PaymentDto> {
    const session = await this.prisma.guestSession.findUnique({
      where: { id: guestSessionId },
      include: { table: { include: { location: true } } },
    });
    if (!session)
      throw new NotFoundException(`Unknown guest session: ${guestSessionId}`);

    // Idempotent, same reasoning as WaiterCallsService.create(): a table
    // must never have two payment intents in flight for the same tab at
    // once (a real provider would double-charge the guest for it).
    const existingPending = await this.prisma.payment.findFirst({
      where: { tableId: session.tableId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    if (existingPending) return this.toDto(existingPending);

    const unpaidOrders = await this.prisma.order.findMany({
      where: { tableId: session.tableId, paidAt: null },
      include: { items: true },
    });
    const amount = unpaidOrders.reduce(
      (sum, order) =>
        sum + order.items.reduce((s, item) => s + item.lineTotal.toNumber(), 0),
      0,
    );
    if (amount <= 0) {
      throw new BadRequestException('Nothing to pay for this table');
    }

    const providerRef = randomUUID();
    const payment = await this.prisma.payment.create({
      data: {
        tableId: session.tableId,
        provider: 'MOCK',
        providerRef,
        amount,
        status: 'PENDING',
      },
    });

    this.mockProvider.createPaymentIntent(providerRef);

    return this.toDto(payment);
  }

  /** Fired by the provider (mock, or a real webhook handler later) once payment actually settles. */
  @OnEvent(PAYMENT_PROVIDER_SETTLED)
  async handleProviderSettled({
    providerRef,
  }: PaymentProviderSettledEvent): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { providerRef },
      include: { table: { include: { location: true } } },
    });
    // Idempotency guard: a real webhook can be retried by the provider.
    if (!payment || payment.status !== 'PENDING') return;

    const confirmedAt = new Date();
    const [updated] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCEEDED', confirmedAt },
      }),
      this.prisma.order.updateMany({
        where: { tableId: payment.tableId, paidAt: null },
        data: { paidAt: confirmedAt },
      }),
    ]);

    const dto = this.toDto(updated);
    this.eventEmitter.emit(DomainEvents.PAYMENT_STATUS_UPDATED, {
      restaurantId: payment.table.location.restaurantId,
      tableId: payment.tableId,
      payment: dto,
    });
  }

  async findLatestForGuestSession(
    guestSessionId: string,
  ): Promise<PaymentDto | null> {
    const session = await this.prisma.guestSession.findUnique({
      where: { id: guestSessionId },
    });
    if (!session)
      throw new NotFoundException(`Unknown guest session: ${guestSessionId}`);

    const payment = await this.prisma.payment.findFirst({
      where: { tableId: session.tableId },
      orderBy: { createdAt: 'desc' },
    });
    return payment ? this.toDto(payment) : null;
  }

  /**
   * Staff-only. Simplification: since one Payment isn't linked to the exact
   * set of orders it covered (no join table - out of scope for this phase),
   * a refund clears paidAt on every currently-paid order at the table. Fine
   * as long as a table has at most one settled, unrefunded payment at a
   * time, which the "sum of unpaid orders" logic in create() already ensures.
   */
  async refund(
    paymentId: string,
    staff: AuthenticatedStaff,
  ): Promise<PaymentDto> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { table: { include: { location: true } } },
    });
    if (!payment) throw new NotFoundException(`Unknown payment: ${paymentId}`);
    if (payment.table.location.restaurantId !== staff.restaurantId) {
      throw new ForbiddenException(
        'This payment belongs to a different restaurant',
      );
    }
    if (payment.status !== 'SUCCEEDED') {
      throw new BadRequestException(
        `Only a SUCCEEDED payment can be refunded (currently ${payment.status})`,
      );
    }

    this.mockProvider.refund(payment.providerRef);

    const [updated] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'REFUNDED' },
      }),
      this.prisma.order.updateMany({
        where: { tableId: payment.tableId, paidAt: { not: null } },
        data: { paidAt: null },
      }),
    ]);

    const dto = this.toDto(updated);
    this.eventEmitter.emit(DomainEvents.PAYMENT_STATUS_UPDATED, {
      restaurantId: payment.table.location.restaurantId,
      tableId: payment.tableId,
      payment: dto,
    });
    return dto;
  }

  private toDto(payment: PaymentRecord): PaymentDto {
    return {
      id: payment.id,
      tableId: payment.tableId,
      provider: payment.provider,
      amount: payment.amount.toNumber(),
      status: payment.status,
      createdAt: payment.createdAt.getTime(),
      confirmedAt: payment.confirmedAt?.getTime() ?? null,
    };
  }
}
