import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WaiterCallsService } from './waiter-calls.service';
import { CreateWaiterCallDto } from './dto/create-waiter-call.dto';
import { UpdateWaiterCallStatusDto } from './dto/update-waiter-call-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentStaff } from '../auth/current-staff.decorator';
import type { AuthenticatedStaff } from '../auth/auth.types';

@Controller()
export class WaiterCallsController {
  constructor(private readonly waiterCallsService: WaiterCallsService) {}

  @Post('waiter-calls')
  create(@Body() dto: CreateWaiterCallDto) {
    return this.waiterCallsService.create(dto);
  }

  @Get('waiter-calls/:id')
  findOne(@Param('id') id: string) {
    return this.waiterCallsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('waiter-calls/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateWaiterCallStatusDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.waiterCallsService.updateStatus(id, dto.status, staff);
  }

  @Get('guest-sessions/:id/waiter-call/active')
  findActiveForGuestSession(@Param('id') id: string) {
    return this.waiterCallsService.findActiveForGuestSession(id);
  }
}
