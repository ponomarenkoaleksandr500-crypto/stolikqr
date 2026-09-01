import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AdminCategoryDto,
  AdminDishSummaryDto,
  DishDto,
  LocalizedText,
  MenuResponseDto,
  StaffDishDto,
} from './menu.types';
import type { AuthenticatedStaff } from '../auth/auth.types';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';
import type { CreateDishDto } from './dto/create-dish.dto';
import type { UpdateDishDto } from './dto/update-dish.dto';
import type {
  CreateIngredientDto,
  UpdateIngredientDto,
} from './dto/ingredient.dto';
import type {
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
} from './dto/modifier-group.dto';
import type {
  CreateModifierChoiceDto,
  UpdateModifierChoiceDto,
} from './dto/modifier-choice.dto';

function asLocalized(value: unknown): LocalizedText {
  return value as LocalizedText;
}

/** Latin-only (see callers - always slugified from the required English name), URL/id-safe. */
function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  );
}

/** Mirrors main.ts's app.useStaticAssets(join(__dirname, '..', 'uploads'), ...) - both resolve to backend/uploads regardless of dev/prod entrypoint. */
const UPLOADS_DIR = join(process.cwd(), 'uploads', 'dishes');

/** Mirrors the [data-theme="..."] blocks in src/app/globals.css - "classic" is the default (no override block needed). */
export const THEME_KEYS = [
  'classic',
  'midnight',
  'botanical',
  'coastal',
  'rose',
] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async getMenuByRestaurantSlug(slug: string): Promise<MenuResponseDto> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
      include: { locations: { take: 1 } },
    });
    if (!restaurant)
      throw new NotFoundException(`Unknown restaurant slug: ${slug}`);
    const location = restaurant.locations[0];
    if (!location)
      throw new NotFoundException(`Restaurant ${slug} has no location`);

    return this.buildMenuResponse(restaurant, location.id);
  }

  async getMenuByQrToken(qrToken: string): Promise<MenuResponseDto> {
    const table = await this.prisma.table.findUnique({
      where: { qrToken },
      include: { location: { include: { restaurant: true } } },
    });
    if (!table) throw new NotFoundException('Unknown table qrToken');

    return this.buildMenuResponse(table.location.restaurant, table.location.id);
  }

  private async buildMenuResponse(
    restaurant: {
      id: string;
      slug: string;
      name: unknown;
      description: unknown;
      address: unknown;
      workingHours: unknown;
      themeKey: string;
      coverPhotoUrl: string | null;
    },
    locationId: string,
  ): Promise<MenuResponseDto> {
    const menu = await this.prisma.menu.findFirst({
      where: { locationId, isActive: true },
      orderBy: { id: 'asc' },
    });
    if (!menu)
      throw new NotFoundException(`Location ${locationId} has no active menu`);

    const categories = await this.prisma.category.findMany({
      where: { menuId: menu.id },
      orderBy: { sortOrder: 'asc' },
    });

    const dishes = await this.prisma.dish.findMany({
      where: { categoryId: { in: categories.map((c) => c.id) } },
      orderBy: { sortOrder: 'asc' },
      include: {
        ingredients: true,
        modifierGroups: {
          orderBy: { sortOrder: 'asc' },
          include: { choices: { orderBy: { sortOrder: 'asc' } } },
        },
        recommendedFrom: { select: { relatedDishId: true } },
      },
    });

    return {
      restaurant: {
        id: restaurant.id,
        slug: restaurant.slug,
        name: restaurant.name as LocalizedText,
        description: restaurant.description as LocalizedText,
        address: restaurant.address as LocalizedText,
        workingHours: restaurant.workingHours as LocalizedText,
        themeKey: restaurant.themeKey,
        coverPhotoUrl: restaurant.coverPhotoUrl ?? undefined,
      },
      categories: categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: asLocalized(c.name),
      })),
      dishes: dishes.map((d): DishDto => ({
        id: d.id,
        slug: d.slug,
        categoryId: d.categoryId,
        name: asLocalized(d.name),
        description: d.description
          ? asLocalized(d.description)
          : { uk: '', en: '' },
        price: d.price.toNumber(),
        emoji: d.emoji ?? '',
        gradient: d.gradient ?? '',
        photoUrl: d.photoUrl ?? undefined,
        tags: (d.tags as Record<string, string[]> | null) ?? undefined,
        ingredients: d.ingredients.map((i) => ({
          id: i.id,
          name: asLocalized(i.name),
          icon: i.icon ?? 'generic',
          removable: i.removable,
        })),
        optionGroups: d.modifierGroups.length
          ? d.modifierGroups.map((g) => ({
              id: g.id,
              name: asLocalized(g.name),
              required: g.required,
              multiple: g.multiple,
              choices: g.choices.map((c) => ({
                id: c.id,
                name: asLocalized(c.name),
                priceDelta: c.priceDelta.toNumber(),
                exclusive: c.exclusive || undefined,
              })),
            }))
          : undefined,
        relatedDishIds: d.recommendedFrom.length
          ? d.recommendedFrom.map((r) => r.relatedDishId)
          : undefined,
        featured: d.featured || undefined,
        isAvailable: d.isAvailable,
      })),
    };
  }

  /** Waiter App stop-list: every dish for this restaurant, flattened with its category name. */
  async getStaffDishList(
    slug: string,
    staff: AuthenticatedStaff,
  ): Promise<StaffDishDto[]> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
    });
    if (!restaurant)
      throw new NotFoundException(`Unknown restaurant slug: ${slug}`);
    if (restaurant.id !== staff.restaurantId) {
      throw new ForbiddenException('Staff does not belong to this restaurant');
    }

    const dishes = await this.prisma.dish.findMany({
      where: {
        category: { menu: { location: { restaurantId: restaurant.id } } },
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      include: { category: true },
    });

    return dishes.map((d) => ({
      id: d.id,
      name: asLocalized(d.name),
      categoryName: asLocalized(d.category.name),
      isAvailable: d.isAvailable,
    }));
  }

  /** Staff-only "stop-list" toggle - see StaffDishDto. */
  async setDishAvailability(
    dishId: string,
    isAvailable: boolean,
    staff: AuthenticatedStaff,
  ): Promise<StaffDishDto> {
    const dish = await this.prisma.dish.findUnique({
      where: { id: dishId },
      include: {
        category: { include: { menu: { include: { location: true } } } },
      },
    });
    if (!dish) throw new NotFoundException(`Unknown dish: ${dishId}`);
    if (dish.category.menu.location.restaurantId !== staff.restaurantId) {
      throw new ForbiddenException(
        'This dish belongs to a different restaurant',
      );
    }

    const updated = await this.prisma.dish.update({
      where: { id: dishId },
      data: { isAvailable },
      include: { category: true },
    });

    return {
      id: updated.id,
      name: asLocalized(updated.name),
      categoryName: asLocalized(updated.category.name),
      isAvailable: updated.isAvailable,
    };
  }

  // --- Admin: shared ownership lookups ---------------------------------------

  /** Restaurant slug -> its one active Menu, verifying `staff` actually owns it. Entry point for admin list/create-category. */
  private async getOwnedActiveMenu(
    slug: string,
    staff: AuthenticatedStaff,
  ): Promise<{ id: string }> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
      include: { locations: { take: 1 } },
    });
    if (!restaurant)
      throw new NotFoundException(`Unknown restaurant slug: ${slug}`);
    if (restaurant.id !== staff.restaurantId) {
      throw new ForbiddenException('Staff does not belong to this restaurant');
    }
    const location = restaurant.locations[0];
    if (!location)
      throw new NotFoundException(`Restaurant ${slug} has no location`);
    const menu = await this.prisma.menu.findFirst({
      where: { locationId: location.id, isActive: true },
      orderBy: { id: 'asc' },
    });
    if (!menu)
      throw new NotFoundException(`Location ${location.id} has no active menu`);
    return menu;
  }

  /** categoryId -> the row, verifying `staff` owns the restaurant it belongs to. */
  private async getOwnedCategory(
    categoryId: string,
    staff: AuthenticatedStaff,
  ) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: { menu: { include: { location: true } } },
    });
    if (!category)
      throw new NotFoundException(`Unknown category: ${categoryId}`);
    if (category.menu.location.restaurantId !== staff.restaurantId) {
      throw new ForbiddenException(
        'This category belongs to a different restaurant',
      );
    }
    return category;
  }

  /** dishId -> the row (with its category), verifying `staff` owns the restaurant it belongs to. */
  private async getOwnedDish(dishId: string, staff: AuthenticatedStaff) {
    const dish = await this.prisma.dish.findUnique({
      where: { id: dishId },
      include: {
        category: { include: { menu: { include: { location: true } } } },
      },
    });
    if (!dish) throw new NotFoundException(`Unknown dish: ${dishId}`);
    if (dish.category.menu.location.restaurantId !== staff.restaurantId) {
      throw new ForbiddenException(
        'This dish belongs to a different restaurant',
      );
    }
    return dish;
  }

  /** groupId -> the row (with its dish's ownership chain), verifying `staff` owns the restaurant it belongs to. */
  private async getOwnedModifierGroup(
    groupId: string,
    staff: AuthenticatedStaff,
  ) {
    const group = await this.prisma.modifierGroup.findUnique({
      where: { id: groupId },
      include: {
        dish: {
          include: {
            category: { include: { menu: { include: { location: true } } } },
          },
        },
      },
    });
    if (!group)
      throw new NotFoundException(`Unknown modifier group: ${groupId}`);
    if (group.dish.category.menu.location.restaurantId !== staff.restaurantId) {
      throw new ForbiddenException(
        'This modifier group belongs to a different restaurant',
      );
    }
    return group;
  }

  /** Re-fetches a dish (ownership already verified by the caller) in the same shape toDishDto expects. */
  private async reloadDish(dishId: string): Promise<DishDto> {
    const dish = await this.prisma.dish.findUniqueOrThrow({
      where: { id: dishId },
      include: {
        ingredients: true,
        modifierGroups: {
          orderBy: { sortOrder: 'asc' },
          include: { choices: { orderBy: { sortOrder: 'asc' } } },
        },
        recommendedFrom: { select: { relatedDishId: true } },
      },
    });
    return this.toDishDto(dish);
  }

  private async uniqueSlug(
    base: string,
    exists: (slug: string) => Promise<boolean>,
  ): Promise<string> {
    const root = slugify(base);
    let candidate = root;
    let suffix = 2;
    while (await exists(candidate)) {
      candidate = `${root}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  // --- Admin: categories -------------------------------------------------------

  async listCategoriesForAdmin(
    slug: string,
    staff: AuthenticatedStaff,
  ): Promise<AdminCategoryDto[]> {
    const menu = await this.getOwnedActiveMenu(slug, staff);
    const categories = await this.prisma.category.findMany({
      where: { menuId: menu.id },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { dishes: true } } },
    });
    return categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: asLocalized(c.name),
      dishCount: c._count.dishes,
    }));
  }

  async createCategory(
    slug: string,
    dto: CreateCategoryDto,
    staff: AuthenticatedStaff,
  ): Promise<AdminCategoryDto> {
    const menu = await this.getOwnedActiveMenu(slug, staff);
    const categorySlug = await this.uniqueSlug(dto.name.en, (candidate) =>
      this.prisma.category
        .findUnique({
          where: { menuId_slug: { menuId: menu.id, slug: candidate } },
        })
        .then(Boolean),
    );
    const maxSortOrder = await this.prisma.category.aggregate({
      where: { menuId: menu.id },
      _max: { sortOrder: true },
    });
    const created = await this.prisma.category.create({
      data: {
        menuId: menu.id,
        slug: categorySlug,
        name: { uk: dto.name.uk, en: dto.name.en },
        sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
      },
    });
    return {
      id: created.id,
      slug: created.slug,
      name: asLocalized(created.name),
      dishCount: 0,
    };
  }

  async renameCategory(
    categoryId: string,
    dto: UpdateCategoryDto,
    staff: AuthenticatedStaff,
  ): Promise<AdminCategoryDto> {
    await this.getOwnedCategory(categoryId, staff);
    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: dto.name ? { name: { uk: dto.name.uk, en: dto.name.en } } : {},
      include: { _count: { select: { dishes: true } } },
    });
    return {
      id: updated.id,
      slug: updated.slug,
      name: asLocalized(updated.name),
      dishCount: updated._count.dishes,
    };
  }

  async deleteCategory(
    categoryId: string,
    staff: AuthenticatedStaff,
  ): Promise<void> {
    const category = await this.getOwnedCategory(categoryId, staff);
    const dishCount = await this.prisma.dish.count({ where: { categoryId } });
    if (dishCount > 0) {
      throw new BadRequestException(
        `This category still has ${dishCount} dish(es) - move or delete them first`,
      );
    }
    await this.prisma.category.delete({ where: { id: category.id } });
  }

  // --- Admin: dishes -------------------------------------------------------

  async listDishesForAdmin(
    slug: string,
    staff: AuthenticatedStaff,
  ): Promise<AdminDishSummaryDto[]> {
    const menu = await this.getOwnedActiveMenu(slug, staff);
    const dishes = await this.prisma.dish.findMany({
      where: { category: { menuId: menu.id } },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });
    return dishes.map((d) => ({
      id: d.id,
      slug: d.slug,
      name: asLocalized(d.name),
      categoryId: d.categoryId,
      price: d.price.toNumber(),
      emoji: d.emoji ?? '',
      photoUrl: d.photoUrl ?? undefined,
      isAvailable: d.isAvailable,
      featured: d.featured,
    }));
  }

  /** Full detail for the dish editor - reuses the guest-facing DishDto shape (same fields the editor needs to show/change). */
  async getDishForAdmin(
    dishId: string,
    staff: AuthenticatedStaff,
  ): Promise<DishDto> {
    await this.getOwnedDish(dishId, staff);
    const dish = await this.prisma.dish.findUniqueOrThrow({
      where: { id: dishId },
      include: {
        ingredients: true,
        modifierGroups: {
          orderBy: { sortOrder: 'asc' },
          include: { choices: { orderBy: { sortOrder: 'asc' } } },
        },
        recommendedFrom: { select: { relatedDishId: true } },
      },
    });
    return this.toDishDto(dish);
  }

  async createDish(
    dto: CreateDishDto,
    staff: AuthenticatedStaff,
  ): Promise<DishDto> {
    const category = await this.getOwnedCategory(dto.categoryId, staff);
    const dishSlug = await this.uniqueSlug(dto.name.en, (candidate) =>
      this.prisma.dish
        .findUnique({
          where: {
            categoryId_slug: { categoryId: category.id, slug: candidate },
          },
        })
        .then(Boolean),
    );
    const maxSortOrder = await this.prisma.dish.aggregate({
      where: { categoryId: category.id },
      _max: { sortOrder: true },
    });
    const created = await this.prisma.dish.create({
      data: {
        categoryId: category.id,
        slug: dishSlug,
        name: { uk: dto.name.uk, en: dto.name.en },
        description: dto.description
          ? { uk: dto.description.uk, en: dto.description.en }
          : undefined,
        price: dto.price,
        emoji: dto.emoji,
        gradient: dto.gradient,
        featured: dto.featured ?? false,
        sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
      },
      include: {
        ingredients: true,
        modifierGroups: { include: { choices: true } },
        recommendedFrom: true,
      },
    });
    return this.toDishDto(created);
  }

  async updateDish(
    dishId: string,
    dto: UpdateDishDto,
    staff: AuthenticatedStaff,
  ): Promise<DishDto> {
    await this.getOwnedDish(dishId, staff);
    if (dto.categoryId) {
      // Moving it elsewhere - that target category must belong to the same restaurant too.
      await this.getOwnedCategory(dto.categoryId, staff);
    }
    const updated = await this.prisma.dish.update({
      where: { id: dishId },
      data: {
        ...(dto.name ? { name: { uk: dto.name.uk, en: dto.name.en } } : {}),
        ...(dto.description
          ? { description: { uk: dto.description.uk, en: dto.description.en } }
          : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        ...(dto.emoji !== undefined ? { emoji: dto.emoji } : {}),
        ...(dto.gradient !== undefined ? { gradient: dto.gradient } : {}),
        ...(dto.featured !== undefined ? { featured: dto.featured } : {}),
      },
      include: {
        ingredients: true,
        modifierGroups: { include: { choices: true } },
        recommendedFrom: true,
      },
    });
    return this.toDishDto(updated);
  }

  async deleteDish(dishId: string, staff: AuthenticatedStaff): Promise<void> {
    await this.getOwnedDish(dishId, staff);
    const orderItemCount = await this.prisma.orderItem.count({
      where: { dishId },
    });
    if (orderItemCount > 0) {
      throw new BadRequestException(
        'This dish has order history and cannot be deleted - use the stop-list to hide it instead',
      );
    }
    await this.prisma.dish.delete({ where: { id: dishId } });
  }

  // --- Admin: site-wide theme --------------------------------------------------

  async updateTheme(
    themeKey: string,
    staff: AuthenticatedStaff,
  ): Promise<{ themeKey: ThemeKey }> {
    if (!THEME_KEYS.includes(themeKey as ThemeKey)) {
      throw new BadRequestException(
        `Unknown theme "${themeKey}" - expected one of ${THEME_KEYS.join(', ')}`,
      );
    }
    const updated = await this.prisma.restaurant.update({
      where: { id: staff.restaurantId },
      data: { themeKey },
    });
    return { themeKey: updated.themeKey as ThemeKey };
  }

  // --- Admin: dish photo -----------------------------------------------------

  private async deleteUploadedPhotoFile(
    photoUrl: string | null,
  ): Promise<void> {
    if (!photoUrl?.includes('/uploads/dishes/')) return;
    const filename = photoUrl.split('/uploads/dishes/')[1];
    if (!filename) return;
    const filePath = join(UPLOADS_DIR, filename);
    if (existsSync(filePath)) await unlink(filePath).catch(() => undefined);
  }

  async setDishPhoto(
    dishId: string,
    file: Express.Multer.File,
    staff: AuthenticatedStaff,
  ): Promise<DishDto> {
    const dish = await this.getOwnedDish(dishId, staff);
    await mkdir(UPLOADS_DIR, { recursive: true });
    const filename = `${dishId}-${Date.now()}${extname(file.originalname) || '.jpg'}`;
    await writeFile(join(UPLOADS_DIR, filename), file.buffer);
    await this.deleteUploadedPhotoFile(dish.photoUrl);

    const apiOrigin =
      process.env.API_PUBLIC_ORIGIN ??
      `http://localhost:${process.env.PORT ?? 4000}`;
    const updated = await this.prisma.dish.update({
      where: { id: dishId },
      data: { photoUrl: `${apiOrigin}/uploads/dishes/${filename}` },
      include: {
        ingredients: true,
        modifierGroups: { include: { choices: true } },
        recommendedFrom: true,
      },
    });
    return this.toDishDto(updated);
  }

  async removeDishPhoto(
    dishId: string,
    staff: AuthenticatedStaff,
  ): Promise<DishDto> {
    const dish = await this.getOwnedDish(dishId, staff);
    await this.deleteUploadedPhotoFile(dish.photoUrl);
    const updated = await this.prisma.dish.update({
      where: { id: dishId },
      data: { photoUrl: null },
      include: {
        ingredients: true,
        modifierGroups: { include: { choices: true } },
        recommendedFrom: true,
      },
    });
    return this.toDishDto(updated);
  }

  // --- Admin: ingredients ---------------------------------------------------

  async addIngredient(
    dishId: string,
    dto: CreateIngredientDto,
    staff: AuthenticatedStaff,
  ): Promise<DishDto> {
    await this.getOwnedDish(dishId, staff);
    await this.prisma.dishIngredient.create({
      data: {
        dishId,
        name: { uk: dto.name.uk, en: dto.name.en },
        icon: dto.icon,
        removable: dto.removable ?? true,
      },
    });
    return this.reloadDish(dishId);
  }

  async updateIngredient(
    dishId: string,
    ingredientId: string,
    dto: UpdateIngredientDto,
    staff: AuthenticatedStaff,
  ): Promise<DishDto> {
    await this.getOwnedDish(dishId, staff);
    const ingredient = await this.prisma.dishIngredient.findUnique({
      where: { id: ingredientId },
    });
    if (!ingredient || ingredient.dishId !== dishId) {
      throw new NotFoundException(`Unknown ingredient: ${ingredientId}`);
    }
    await this.prisma.dishIngredient.update({
      where: { id: ingredientId },
      data: {
        ...(dto.name ? { name: { uk: dto.name.uk, en: dto.name.en } } : {}),
        ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
        ...(dto.removable !== undefined ? { removable: dto.removable } : {}),
      },
    });
    return this.reloadDish(dishId);
  }

  async removeIngredient(
    dishId: string,
    ingredientId: string,
    staff: AuthenticatedStaff,
  ): Promise<DishDto> {
    await this.getOwnedDish(dishId, staff);
    const ingredient = await this.prisma.dishIngredient.findUnique({
      where: { id: ingredientId },
    });
    if (!ingredient || ingredient.dishId !== dishId) {
      throw new NotFoundException(`Unknown ingredient: ${ingredientId}`);
    }
    await this.prisma.dishIngredient.delete({ where: { id: ingredientId } });
    return this.reloadDish(dishId);
  }

  // --- Admin: modifier groups + choices ---------------------------------------

  async addModifierGroup(
    dishId: string,
    dto: CreateModifierGroupDto,
    staff: AuthenticatedStaff,
  ): Promise<DishDto> {
    await this.getOwnedDish(dishId, staff);
    const maxSortOrder = await this.prisma.modifierGroup.aggregate({
      where: { dishId },
      _max: { sortOrder: true },
    });
    await this.prisma.modifierGroup.create({
      data: {
        dishId,
        name: { uk: dto.name.uk, en: dto.name.en },
        required: dto.required ?? false,
        multiple: dto.multiple ?? false,
        sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
      },
    });
    return this.reloadDish(dishId);
  }

  async updateModifierGroup(
    dishId: string,
    groupId: string,
    dto: UpdateModifierGroupDto,
    staff: AuthenticatedStaff,
  ): Promise<DishDto> {
    const group = await this.getOwnedModifierGroup(groupId, staff);
    if (group.dishId !== dishId) {
      throw new NotFoundException(
        `Modifier group ${groupId} does not belong to dish ${dishId}`,
      );
    }
    await this.prisma.modifierGroup.update({
      where: { id: groupId },
      data: {
        ...(dto.name ? { name: { uk: dto.name.uk, en: dto.name.en } } : {}),
        ...(dto.required !== undefined ? { required: dto.required } : {}),
        ...(dto.multiple !== undefined ? { multiple: dto.multiple } : {}),
      },
    });
    return this.reloadDish(dishId);
  }

  async removeModifierGroup(
    dishId: string,
    groupId: string,
    staff: AuthenticatedStaff,
  ): Promise<DishDto> {
    const group = await this.getOwnedModifierGroup(groupId, staff);
    if (group.dishId !== dishId) {
      throw new NotFoundException(
        `Modifier group ${groupId} does not belong to dish ${dishId}`,
      );
    }
    await this.prisma.modifierGroup.delete({ where: { id: groupId } });
    return this.reloadDish(dishId);
  }

  async addModifierChoice(
    groupId: string,
    dto: CreateModifierChoiceDto,
    staff: AuthenticatedStaff,
  ): Promise<DishDto> {
    const group = await this.getOwnedModifierGroup(groupId, staff);
    const maxSortOrder = await this.prisma.modifierChoice.aggregate({
      where: { groupId },
      _max: { sortOrder: true },
    });
    await this.prisma.modifierChoice.create({
      data: {
        groupId,
        name: { uk: dto.name.uk, en: dto.name.en },
        priceDelta: dto.priceDelta ?? 0,
        exclusive: dto.exclusive ?? false,
        sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
      },
    });
    return this.reloadDish(group.dishId);
  }

  async updateModifierChoice(
    groupId: string,
    choiceId: string,
    dto: UpdateModifierChoiceDto,
    staff: AuthenticatedStaff,
  ): Promise<DishDto> {
    const group = await this.getOwnedModifierGroup(groupId, staff);
    const choice = await this.prisma.modifierChoice.findUnique({
      where: { id: choiceId },
    });
    if (!choice || choice.groupId !== groupId) {
      throw new NotFoundException(`Unknown modifier choice: ${choiceId}`);
    }
    await this.prisma.modifierChoice.update({
      where: { id: choiceId },
      data: {
        ...(dto.name ? { name: { uk: dto.name.uk, en: dto.name.en } } : {}),
        ...(dto.priceDelta !== undefined ? { priceDelta: dto.priceDelta } : {}),
        ...(dto.exclusive !== undefined ? { exclusive: dto.exclusive } : {}),
      },
    });
    return this.reloadDish(group.dishId);
  }

  async removeModifierChoice(
    groupId: string,
    choiceId: string,
    staff: AuthenticatedStaff,
  ): Promise<DishDto> {
    const group = await this.getOwnedModifierGroup(groupId, staff);
    const choice = await this.prisma.modifierChoice.findUnique({
      where: { id: choiceId },
    });
    if (!choice || choice.groupId !== groupId) {
      throw new NotFoundException(`Unknown modifier choice: ${choiceId}`);
    }
    await this.prisma.modifierChoice.delete({ where: { id: choiceId } });
    return this.reloadDish(group.dishId);
  }

  /** Shared by getDishForAdmin/createDish/updateDish - identical mapping to buildMenuResponse's per-dish shape. */
  private toDishDto(d: {
    id: string;
    slug: string;
    categoryId: string;
    name: unknown;
    description: unknown;
    price: { toNumber(): number };
    emoji: string | null;
    gradient: string | null;
    photoUrl: string | null;
    tags: unknown;
    featured: boolean;
    isAvailable: boolean;
    ingredients: {
      id: string;
      name: unknown;
      icon: string | null;
      removable: boolean;
    }[];
    modifierGroups: {
      id: string;
      name: unknown;
      required: boolean;
      multiple: boolean;
      choices: {
        id: string;
        name: unknown;
        priceDelta: { toNumber(): number };
        exclusive: boolean;
      }[];
    }[];
    recommendedFrom: { relatedDishId: string }[];
  }): DishDto {
    return {
      id: d.id,
      slug: d.slug,
      categoryId: d.categoryId,
      name: asLocalized(d.name),
      description: d.description
        ? asLocalized(d.description)
        : { uk: '', en: '' },
      price: d.price.toNumber(),
      emoji: d.emoji ?? '',
      gradient: d.gradient ?? '',
      photoUrl: d.photoUrl ?? undefined,
      tags: (d.tags as Record<string, string[]> | null) ?? undefined,
      ingredients: d.ingredients.map((i) => ({
        id: i.id,
        name: asLocalized(i.name),
        icon: i.icon ?? 'generic',
        removable: i.removable,
      })),
      optionGroups: d.modifierGroups.length
        ? d.modifierGroups.map((g) => ({
            id: g.id,
            name: asLocalized(g.name),
            required: g.required,
            multiple: g.multiple,
            choices: g.choices.map((c) => ({
              id: c.id,
              name: asLocalized(c.name),
              priceDelta: c.priceDelta.toNumber(),
              exclusive: c.exclusive || undefined,
            })),
          }))
        : undefined,
      relatedDishIds: d.recommendedFrom.length
        ? d.recommendedFrom.map((r) => r.relatedDishId)
        : undefined,
      featured: d.featured || undefined,
      isAvailable: d.isAvailable,
    };
  }
}
