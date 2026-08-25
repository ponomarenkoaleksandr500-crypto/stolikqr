import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GuestSessionsService } from './guest-sessions.service';
import { CreateGuestSessionDto } from './dto/create-guest-session.dto';

@Controller('guest-sessions')
export class GuestSessionsController {
  constructor(private readonly guestSessionsService: GuestSessionsService) {}

  @Post()
  create(@Body() dto: CreateGuestSessionDto) {
    return this.guestSessionsService.createOrResume(
      dto.qrToken,
      dto.deviceToken,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.guestSessionsService.findById(id);
  }
}
