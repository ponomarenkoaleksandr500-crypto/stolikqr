import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { OrdersModule } from '../orders/orders.module';
import { WaiterCallsModule } from '../waiter-calls/waiter-calls.module';

@Module({
  imports: [OrdersModule, WaiterCallsModule],
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
