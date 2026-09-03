import type { $Enums } from '../../generated/prisma/client';

/**
 * The seam a real gateway drops into (DEC-006).
 *
 * PaymentsService depends on this token, never on a concrete provider, so
 * binding a real adapter in PaymentsModule touches neither the service, nor
 * the schema, nor any frontend code.
 *
 * `mode` is the load-bearing part. A provider that does not move real money
 * must say so, and the service records that answer on every payment row —
 * otherwise a stub settlement is indistinguishable from a real one after the
 * fact, which is a false accounting record rather than a demo.
 */
export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface PaymentProvider {
  /** DEMO when no real money moves. Written to Payment.mode at creation. */
  readonly mode: $Enums.PaymentMode;

  /**
   * Starts a settlement. The provider is responsible for emitting
   * PAYMENT_PROVIDER_SETTLED when it actually settles — immediately for a
   * stub, on a signed webhook for a real gateway.
   *
   * `immediate` is the guest-checkout path, which expects the payment to be
   * settled by the time the request returns. A real adapter would instead
   * hand back a redirect URL here; that changes the guest flow, so it is a
   * deliberate follow-up rather than something to fake now.
   */
  createPaymentIntent(
    providerRef: string,
    immediate: boolean,
  ): void | Promise<void>;

  refund(providerRef: string): void | Promise<void>;
}
