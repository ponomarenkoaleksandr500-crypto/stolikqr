import { IsIn, IsOptional } from 'class-validator';

// Guest self-checkout methods only - MOCK (the "bring the bill" waiter-call
// flow's default) is never something a guest explicitly picks, see
// PaymentsService.create.
export const GUEST_PAYMENT_METHODS = [
  'CARD',
  'APPLE_PAY',
  'GOOGLE_PAY',
  'EXPIRENZA',
] as const;
export type GuestPaymentMethod = (typeof GUEST_PAYMENT_METHODS)[number];

export class CreatePaymentDto {
  @IsIn(GUEST_PAYMENT_METHODS)
  @IsOptional()
  provider?: GuestPaymentMethod;
}
