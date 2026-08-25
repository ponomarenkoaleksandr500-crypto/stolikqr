import { Controller, Get, Param } from '@nestjs/common';
import { MenuService } from './menu.service';
import type { MenuResponseDto } from './menu.types';

@Controller()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // Plain menu browsing without a table (GET /r/[slug]/[categorySlug] today).
  @Get('restaurants/:slug/menu')
  getByRestaurantSlug(@Param('slug') slug: string): Promise<MenuResponseDto> {
    return this.menuService.getMenuByRestaurantSlug(slug);
  }

  // Table-scoped entry (GET /r/[slug]/t/[tableCode] today): the qrToken alone
  // determines Table -> Location -> Menu, no restaurantId passed by the client.
  @Get('tables/:qrToken/menu')
  getByQrToken(@Param('qrToken') qrToken: string): Promise<MenuResponseDto> {
    return this.menuService.getMenuByQrToken(qrToken);
  }
}
