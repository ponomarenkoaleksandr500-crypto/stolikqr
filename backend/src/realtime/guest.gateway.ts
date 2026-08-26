import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import type { Server, Socket } from 'socket.io';
import {
  DomainEvents,
  type OrderEvent,
  type PaymentEvent,
  type TableClosedEvent,
  type WaiterCallEvent,
} from './domain-events';

/**
 * Guest side of realtime: one room per table, joined via a `tableId` query
 * param - no auth, matching the rest of the Guest App's anonymous model. A
 * guest only ever receives their own table's updates (no cross-table data),
 * so this doesn't need to be more locked down than that.
 */
@WebSocketGateway({
  namespace: '/ws/guest',
  cors: { origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000' },
})
export class GuestGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(GuestGateway.name);

  handleConnection(client: Socket): void {
    const tableId = client.handshake.query.tableId;
    if (typeof tableId !== 'string' || !tableId) {
      this.logger.warn(`Rejected guest socket ${client.id} with no tableId`);
      client.disconnect(true);
      return;
    }
    void client.join(`table:${tableId}`);
    this.logger.log(`Guest socket ${client.id} joined table:${tableId}`);
  }

  @OnEvent(DomainEvents.ORDER_CREATED)
  handleOrderCreated(event: OrderEvent) {
    this.server
      .to(`table:${event.tableId}`)
      .emit('order.status.updated', event.order);
  }

  @OnEvent(DomainEvents.ORDER_STATUS_UPDATED)
  handleOrderStatusUpdated(event: OrderEvent) {
    this.server
      .to(`table:${event.tableId}`)
      .emit('order.status.updated', event.order);
  }

  @OnEvent(DomainEvents.WAITER_CALL_CREATED)
  handleWaiterCallCreated(event: WaiterCallEvent) {
    this.server
      .to(`table:${event.tableId}`)
      .emit('waiterCall.status.updated', event.waiterCall);
  }

  @OnEvent(DomainEvents.WAITER_CALL_STATUS_UPDATED)
  handleWaiterCallStatusUpdated(event: WaiterCallEvent) {
    this.server
      .to(`table:${event.tableId}`)
      .emit('waiterCall.status.updated', event.waiterCall);
  }

  @OnEvent(DomainEvents.PAYMENT_STATUS_UPDATED)
  handlePaymentStatusUpdated(event: PaymentEvent) {
    this.server
      .to(`table:${event.tableId}`)
      .emit('payment.status.updated', event.payment);
  }

  @OnEvent(DomainEvents.TABLE_CLOSED)
  handleTableClosed(event: TableClosedEvent) {
    this.server.to(`table:${event.tableId}`).emit('table.closed', {
      closedAt: event.closedAt,
    });
  }
}
