import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentStaff } from '../auth/current-staff.decorator';
import type { AuthenticatedStaff } from '../auth/auth.types';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('orders')
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Get('orders/:id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Get('guest-sessions/:id/orders')
  findForGuestSession(@Param('id') id: string) {
    return this.ordersService.findForGuestSession(id);
  }

  @Post('guest-sessions/:id/orders/reorder')
  reorder(@Param('id') id: string) {
    return this.ordersService.reorder(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('orders/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.ordersService.updateStatus(id, dto.status, staff);
  }
}
