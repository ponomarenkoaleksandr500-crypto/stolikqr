import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentStaff } from '../auth/current-staff.decorator';
import type { AuthenticatedStaff } from '../auth/auth.types';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('guest-sessions/:id/payments')
  create(@Param('id') guestSessionId: string) {
    return this.paymentsService.create(guestSessionId);
  }

  @Get('guest-sessions/:id/payments/latest')
  findLatest(@Param('id') guestSessionId: string) {
    return this.paymentsService.findLatestForGuestSession(guestSessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('payments/:id/refund')
  refund(@Param('id') id: string, @CurrentStaff() staff: AuthenticatedStaff) {
    return this.paymentsService.refund(id, staff);
  }
}
