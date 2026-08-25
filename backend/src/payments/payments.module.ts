import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MockPaymentProvider } from './mock-payment-provider';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, MockPaymentProvider],
})
export class PaymentsModule {}
