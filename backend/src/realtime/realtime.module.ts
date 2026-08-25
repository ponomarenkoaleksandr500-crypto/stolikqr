import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StaffGateway } from './staff.gateway';
import { GuestGateway } from './guest.gateway';

@Module({
  imports: [AuthModule], // reuses AuthModule's JwtModule to verify staff sockets
  providers: [StaffGateway, GuestGateway],
})
export class RealtimeModule {}
