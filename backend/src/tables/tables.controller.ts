import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TablesService } from './tables.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentStaff } from '../auth/current-staff.decorator';
import type { AuthenticatedStaff } from '../auth/auth.types';

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get('resolve')
  resolve(@Query('slug') slug?: string, @Query('code') code?: string) {
    if (!slug || !code)
      throw new BadRequestException('slug and code query params are required');
    return this.tablesService.resolveBySlugAndCode(slug, code);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/close')
  close(@Param('id') id: string, @CurrentStaff() staff: AuthenticatedStaff) {
    return this.tablesService.close(id, staff);
  }
}
