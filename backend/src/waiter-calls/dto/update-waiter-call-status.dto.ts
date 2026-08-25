import { IsIn } from 'class-validator';

export const WAITER_CALL_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'IN_PROGRESS',
  'COMPLETED',
] as const;
export type WaiterCallStatusValue = (typeof WAITER_CALL_STATUSES)[number];

export class UpdateWaiterCallStatusDto {
  @IsIn(WAITER_CALL_STATUSES)
  status!: WaiterCallStatusValue;
}
