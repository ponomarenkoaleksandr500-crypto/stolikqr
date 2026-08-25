import { Module } from '@nestjs/common';
import { WaiterCallsController } from './waiter-calls.controller';
import { WaiterCallsService } from './waiter-calls.service';

@Module({
  controllers: [WaiterCallsController],
  providers: [WaiterCallsService],
  exports: [WaiterCallsService],
})
export class WaiterCallsModule {}
