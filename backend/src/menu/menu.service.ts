import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { DishDto, LocalizedText, MenuResponseDto } from './menu.types';

function asLocalized(value: unknown): LocalizedText {
  return value as LocalizedText;
}

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
        tags: (d.tags as Record<string, string[]> | null) ?? undefined,
        ingredients: d.ingredients.map((i) => ({
          id: i.id,
          name: asLocalized(i.name),
          icon: i.icon ?? 'generic',
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
      })),
    };
  }
}
