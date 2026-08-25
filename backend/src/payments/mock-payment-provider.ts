import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PAYMENT_PROVIDER_SETTLED } from './payments.types';

// Stands in for a real provider adapter (Monobank/LiqPay - see the fixed
// architecture doc's Payment Provider Interface) while no real merchant
// credentials exist in this environment. A real adapter would redirect the
// guest to a hosted payment page and settle via a signed webhook instead of
// a timer; PaymentsService only depends on this interface-shaped surface
// (createPaymentIntent/refund), so swapping providers later doesn't touch
// the service, the schema, or any frontend code. A real adapter would also
// expose a verifyWebhook(payload, signature) method - omitted here since
// nothing external ever calls a webhook in mock mode, and an unused stub
// isn't worth carrying until there's a real provider to receive it from.
const MOCK_SETTLEMENT_DELAY_MS = 8000;

@Injectable()
export class MockPaymentProvider {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  createPaymentIntent(providerRef: string): void {
    setTimeout(() => {
      this.eventEmitter.emit(PAYMENT_PROVIDER_SETTLED, { providerRef });
    }, MOCK_SETTLEMENT_DELAY_MS);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept to document the adapter's real shape
  refund(providerRef: string): void {
    // No real gateway to call back - refunding is instantaneous in mock mode.
  }
}
