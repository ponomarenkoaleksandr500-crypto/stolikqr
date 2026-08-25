import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { TrackEventDto } from './dto/track-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentStaff } from '../auth/current-staff.decorator';
import type { AuthenticatedStaff } from '../auth/auth.types';

@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // Public, unauthenticated - fired fire-and-forget from the Guest App as
  // guests browse. No side effect worth a response body.
  @Post('analytics/events')
  @HttpCode(204)
  async track(@Body() dto: TrackEventDto): Promise<void> {
    await this.analyticsService.track(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('restaurants/:slug/staff/analytics')
  getSummary(
    @Param('slug') slug: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.analyticsService.getSummary(slug, staff);
  }
}
