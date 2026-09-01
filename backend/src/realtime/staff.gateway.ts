import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../auth/auth.types';
import {
  DomainEvents,
  type GuestSessionEvent,
  type OrderEvent,
  type PaymentEvent,
  type TableClosedEvent,
  type WaiterCallEvent,
} from './domain-events';

/**
 * Staff (Waiter App) side of realtime: one room per restaurant. A client must
 * present a valid staff JWT in the Socket.IO handshake (`auth.token`) - there
 * is no anonymous staff access. Connection-time auth only (no per-message
 * re-checks), matching the "simple auth" scope for this phase.
 */
@WebSocketGateway({
  namespace: '/ws/staff',
  cors: { origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000' },
})
export class StaffGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(StaffGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      await client.join(`restaurant:${payload.restaurantId}`);
      this.logger.log(
        `Staff socket ${client.id} joined restaurant:${payload.restaurantId}`,
      );
    } catch (err) {
      this.logger.warn(
        `Rejected staff socket with an invalid/expired token: ${String(err)}`,
      );
      client.disconnect(true);
    }
  }

  @OnEvent(DomainEvents.ORDER_CREATED)
  handleOrderCreated(event: OrderEvent) {
    this.server
      .to(`restaurant:${event.restaurantId}`)
      .emit('order.created', event.order);
  }

  @OnEvent(DomainEvents.ORDER_STATUS_UPDATED)
  handleOrderStatusUpdated(event: OrderEvent) {
    this.server
      .to(`restaurant:${event.restaurantId}`)
      .emit('order.status.updated', event.order);
  }

  @OnEvent(DomainEvents.WAITER_CALL_CREATED)
  handleWaiterCallCreated(event: WaiterCallEvent) {
    this.server
      .to(`restaurant:${event.restaurantId}`)
      .emit('waiterCall.created', event.waiterCall);
  }

  @OnEvent(DomainEvents.WAITER_CALL_STATUS_UPDATED)
  handleWaiterCallStatusUpdated(event: WaiterCallEvent) {
    this.server
      .to(`restaurant:${event.restaurantId}`)
      .emit('waiterCall.status.updated', event.waiterCall);
  }

  @OnEvent(DomainEvents.PAYMENT_STATUS_UPDATED)
  handlePaymentStatusUpdated(event: PaymentEvent) {
    this.server
      .to(`restaurant:${event.restaurantId}`)
      .emit('payment.status.updated', event.payment);
  }

  @OnEvent(DomainEvents.TABLE_CLOSED)
  handleTableClosed(event: TableClosedEvent) {
    this.server.to(`restaurant:${event.restaurantId}`).emit('table.closed', {
      tableId: event.tableId,
      closedAt: event.closedAt,
    });
  }

  /**
   * A guest scanning the QR is what turns a table from FREE to OCCUPIED, and
   * it was the one table-state transition the Waiter App never heard about:
   * the domain event existed and analytics listened to it, but this gateway
   * never forwarded it, so the floor plan only caught up once something else
   * happened at that table.
   */
  @OnEvent(DomainEvents.GUEST_SESSION_STARTED)
  handleGuestSessionStarted(event: GuestSessionEvent) {
    this.server
      .to(`restaurant:${event.restaurantId}`)
      .emit('guestSession.started', {
        tableId: event.tableId,
        guestSessionId: event.guestSessionId,
      });
  }
}
