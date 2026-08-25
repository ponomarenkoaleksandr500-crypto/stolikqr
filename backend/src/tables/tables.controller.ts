import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { TablesService } from './tables.service';

@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get('resolve')
  resolve(@Query('slug') slug?: string, @Query('code') code?: string) {
    if (!slug || !code)
      throw new BadRequestException('slug and code query params are required');
    return this.tablesService.resolveBySlugAndCode(slug, code);
  }
}
