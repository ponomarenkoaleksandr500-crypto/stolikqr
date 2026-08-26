import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { MenuService } from './menu.service';
import type { MenuResponseDto, StaffDishDto } from './menu.types';
import { UpdateDishAvailabilityDto } from './dto/update-dish-availability.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentStaff } from '../auth/current-staff.decorator';
import type { AuthenticatedStaff } from '../auth/auth.types';

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

  @UseGuards(JwtAuthGuard)
  @Get('restaurants/:slug/staff/dishes')
  getStaffDishList(
    @Param('slug') slug: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ): Promise<StaffDishDto[]> {
    return this.menuService.getStaffDishList(slug, staff);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('dishes/:id/availability')
  setDishAvailability(
    @Param('id') id: string,
    @Body() dto: UpdateDishAvailabilityDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ): Promise<StaffDishDto> {
    return this.menuService.setDishAvailability(id, dto.isAvailable, staff);
  }
}
