import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MenuService } from './menu.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateDishDto } from './dto/create-dish.dto';
import { UpdateDishDto } from './dto/update-dish.dto';
import { CreateIngredientDto, UpdateIngredientDto } from './dto/ingredient.dto';
import {
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
} from './dto/modifier-group.dto';
import {
  CreateModifierChoiceDto,
  UpdateModifierChoiceDto,
} from './dto/modifier-choice.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentStaff } from '../auth/current-staff.decorator';
import type { AuthenticatedStaff } from '../auth/auth.types';

/** Admin App menu editor - every route here requires role === 'ADMIN' (see AdminGuard). */
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminMenuController {
  constructor(private readonly menuService: MenuService) {}

  @Patch('theme')
  updateTheme(
    @Body() dto: UpdateThemeDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.menuService.updateTheme(dto.themeKey, staff);
  }

  @Get('categories')
  listCategories(
    @Query('slug') slug: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.menuService.listCategoriesForAdmin(slug, staff);
  }

  @Post('categories')
  createCategory(
    @Query('slug') slug: string,
    @Body() dto: CreateCategoryDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.menuService.createCategory(slug, dto, staff);
  }

  @Patch('categories/:id')
  renameCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.menuService.renameCategory(id, dto, staff);
  }

  @Delete('categories/:id')
  deleteCategory(
    @Param('id') id: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.menuService.deleteCategory(id, staff);
  }

  @Get('dishes')
  listDishes(
    @Query('slug') slug: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.menuService.listDishesForAdmin(slug, staff);
  }

  @Get('dishes/:id')
  getDish(@Param('id') id: string, @CurrentStaff() staff: AuthenticatedStaff) {
    return this.menuService.getDishForAdmin(id, staff);
  }

  @Post('dishes')
  createDish(
    @Body() dto: CreateDishDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.menuService.createDish(dto, staff);
  }

  @Patch('dishes/:id')
  updateDish(
    @Param('id') id: string,
    @Body() dto: UpdateDishDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.menuService.updateDish(id, dto, staff);
  }

  @Delete('dishes/:id')
  deleteDish(
    @Param('id') id: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.menuService.deleteDish(id, staff);
  }

  @Post('dishes/:id/photo')
  @UseInterceptors(FileInterceptor('photo'))
  setDishPhoto(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    file: Express.Multer.File,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.menuService.setDishPhoto(id, file, staff);
  }

  @Delete('dishes/:id/photo')
  removeDishPhoto(
    @Param('id') id: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.menuService.removeDishPhoto(id, staff);
  }

  @Post('dishes/:id/ingredients')
  addIngredient(
    @Param('id') id: string,
    @Body() dto: CreateIngredientDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.menuService.addIngredient(id, dto, staff);
  }

  @Patch('dishes/:id/ingredients/:ingredientId')
  updateIngredient(
    @Param('id') id: string,
    @Param('ingredientId') ingredientId: string,
    @Body() dto: UpdateIngredientDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.menuService.updateIngredient(id, ingredientId, dto, staff);
  }

  @Delete('dishes/:id/ingredients/:ingredientId')
  removeIngredient(
    @Param('id') id: string,
    @Param('ingredientId') ingredientId: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.menuService.removeIngredient(id, ingredientId, staff);
  }

  @Post('dishes/:id/modifier-groups')
  addModifierGroup(
    @Param('id') id: string,
    @Body() dto: CreateModifierGroupDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.menuService.addModifierGroup(id, dto, staff);
  }

  @Patch('dishes/:id/modifier-groups/:groupId')
  updateModifierGroup(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateModifierGroupDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.menuService.updateModifierGroup(id, groupId, dto, staff);
  }

  @Delete('dishes/:id/modifier-groups/:groupId')
  removeModifierGroup(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.menuService.removeModifierGroup(id, groupId, staff);
  }

  @Post('modifier-groups/:groupId/choices')
  addModifierChoice(
    @Param('groupId') groupId: string,
    @Body() dto: CreateModifierChoiceDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.menuService.addModifierChoice(groupId, dto, staff);
  }

  @Patch('modifier-groups/:groupId/choices/:choiceId')
  updateModifierChoice(
    @Param('groupId') groupId: string,
    @Param('choiceId') choiceId: string,
    @Body() dto: UpdateModifierChoiceDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.menuService.updateModifierChoice(groupId, choiceId, dto, staff);
  }

  @Delete('modifier-groups/:groupId/choices/:choiceId')
  removeModifierChoice(
    @Param('groupId') groupId: string,
    @Param('choiceId') choiceId: string,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.menuService.removeModifierChoice(groupId, choiceId, staff);
  }
}
