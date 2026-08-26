import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller';
import { AdminMenuController } from './admin-menu.controller';
import { MenuService } from './menu.service';

@Module({
  controllers: [MenuController, AdminMenuController],
  providers: [MenuService],
})
export class MenuModule {}
