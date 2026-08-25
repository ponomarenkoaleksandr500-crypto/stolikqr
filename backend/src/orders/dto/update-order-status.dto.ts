import { IsIn } from 'class-validator';

export const ORDER_STATUSES = [
  'NEW',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'SERVED',
] as const;
export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUSES)
  status!: OrderStatusValue;
}
