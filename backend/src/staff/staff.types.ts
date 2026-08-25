import type { OrderDto } from '../orders/orders.types';
import type { WaiterCallDto } from '../waiter-calls/waiter-calls.types';

export interface StaffTableDto {
  id: string;
  code: string;
  label: string | null;
  hasActiveOrder: boolean;
  hasActiveCall: boolean;
}

export interface StaffOverviewDto {
  tables: StaffTableDto[];
  activeOrders: OrderDto[];
  activeCalls: WaiterCallDto[];
}
