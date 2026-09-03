import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PAYMENT_PROVIDER_SETTLED } from './payments.types';
import type { PaymentProvider } from './payment-provider';
import type { $Enums } from '../../generated/prisma/client';

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
export class MockPaymentProvider implements PaymentProvider {
  // Every settlement this provider produces is recorded DEMO. No money moves
  // here, and the row must say so (DEC-006).
  readonly mode: $Enums.PaymentMode = 'DEMO';

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async createPaymentIntent(
    providerRef: string,
    immediate: boolean,
  ): Promise<void> {
    if (immediate) {
      // Guest checkout expects the payment settled by the time the request
      // returns. It still goes THROUGH the provider rather than around it —
      // previously PaymentsService called settle() directly on this path, so
      // the provider was not involved at all and "who settled this" had no
      // answer.
      // emitAsync, not emit: the caller returns the settled payment right
      // after this, so the settlement listener must have finished. Plain
      // emit() does not await an async listener, which would race.
      await this.eventEmitter.emitAsync(PAYMENT_PROVIDER_SETTLED, {
        providerRef,
      });
      return;
    }
    setTimeout(() => {
      this.eventEmitter.emit(PAYMENT_PROVIDER_SETTLED, { providerRef });
    }, MOCK_SETTLEMENT_DELAY_MS);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept to document the adapter's real shape
  refund(providerRef: string): void {
    // No real gateway to call back - refunding is instantaneous in mock mode.
  }
}
