import type { OrderDto } from '../orders/orders.types';
import type { WaiterCallDto } from '../waiter-calls/waiter-calls.types';
import type { PaymentDto } from '../payments/payments.types';

export const DomainEvents = {
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_UPDATED: 'order.status.updated',
  WAITER_CALL_CREATED: 'waiterCall.created',
  WAITER_CALL_STATUS_UPDATED: 'waiterCall.status.updated',
  PAYMENT_STATUS_UPDATED: 'payment.status.updated',
  GUEST_SESSION_STARTED: 'guestSession.started',
  TABLE_CLOSED: 'table.closed',
} as const;

export interface OrderEvent {
  restaurantId: string;
  tableId: string;
  order: OrderDto;
}

export interface WaiterCallEvent {
  restaurantId: string;
  tableId: string;
  waiterCall: WaiterCallDto;
}

export interface PaymentEvent {
  restaurantId: string;
  tableId: string;
  payment: PaymentDto;
}

export interface GuestSessionEvent {
  restaurantId: string;
  tableId: string;
  guestSessionId: string;
}

export interface TableClosedEvent {
  restaurantId: string;
  tableId: string;
  closedAt: number;
}
