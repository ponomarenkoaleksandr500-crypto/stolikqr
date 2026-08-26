import type { OrderDto } from '../orders/orders.types';
import type { WaiterCallDto } from '../waiter-calls/waiter-calls.types';

// Waiter App floor plan color-coding, priority order highest first (a table
// showing an active call always wins over "just occupied", etc.) - see
// StaffService.getOverview for how these are derived.
export type TableFloorStatus =
  'CALLED_WAITER' | 'AWAITING_PAYMENT' | 'ORDERED' | 'OCCUPIED' | 'FREE';

export interface StaffTableDto {
  id: string;
  code: string;
  label: string | null;
  zone: string | null;
  status: TableFloorStatus;
  hasActiveOrder: boolean;
  hasActiveCall: boolean;
}

export interface StaffOverviewDto {
  tables: StaffTableDto[];
  activeOrders: OrderDto[];
  activeCalls: WaiterCallDto[];
}
