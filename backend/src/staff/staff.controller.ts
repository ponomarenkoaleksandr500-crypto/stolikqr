import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentStaff } from '../auth/current-staff.decorator';
import type { AuthenticatedStaff } from '../auth/auth.types';

@Controller()
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @UseGuards(JwtAuthGuard)
  @Get('restaurants/:slug/staff/overview')
  getOverview(
    @Param('slug') slug: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.staffService.getOverview(slug, staff);
  }
}
