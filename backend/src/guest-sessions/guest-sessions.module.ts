import { Module } from '@nestjs/common';
import { GuestSessionsController } from './guest-sessions.controller';
import { GuestSessionsService } from './guest-sessions.service';

@Module({
  controllers: [GuestSessionsController],
  providers: [GuestSessionsService],
})
export class GuestSessionsModule {}
