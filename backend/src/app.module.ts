import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MenuModule } from './menu/menu.module';
import { TablesModule } from './tables/tables.module';
import { GuestSessionsModule } from './guest-sessions/guest-sessions.module';
import { OrdersModule } from './orders/orders.module';
import { WaiterCallsModule } from './waiter-calls/waiter-calls.module';
import { AuthModule } from './auth/auth.module';
import { RealtimeModule } from './realtime/realtime.module';
import { StaffModule } from './staff/staff.module';
import { PaymentsModule } from './payments/payments.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    PrismaModule,
    MenuModule,
    TablesModule,
    GuestSessionsModule,
    OrdersModule,
    WaiterCallsModule,
    AuthModule,
    RealtimeModule,
    StaffModule,
    PaymentsModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
