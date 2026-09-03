import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MockPaymentProvider } from './mock-payment-provider';
import { PAYMENT_PROVIDER } from './payment-provider';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    // The single place a real gateway gets wired in (DEC-006). Binding a
    // different adapter here is the whole change: PaymentsService depends on
    // the token, so neither it, nor the schema, nor the frontend moves.
    { provide: PAYMENT_PROVIDER, useClass: MockPaymentProvider },
  ],
})
export class PaymentsModule {}
