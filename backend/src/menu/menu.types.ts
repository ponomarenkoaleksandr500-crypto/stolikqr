// Response shapes mirror stolikqr/src/types/menu.ts (Restaurant/Category/Dish/
// OptionGroup/OptionChoice/DishIngredient) field-for-field, so the frontend
// can consume this payload without changing its component prop types.

export interface LocalizedText {
  uk: string;
  en: string;
}

export interface RestaurantDto {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  address: LocalizedText;
  workingHours: LocalizedText;
}

export interface CategoryDto {
  id: string;
  slug: string;
  name: LocalizedText;
}

export interface DishIngredientDto {
  id: string;
  name: LocalizedText;
  icon: string;
}

export interface OptionChoiceDto {
  id: string;
  name: LocalizedText;
  priceDelta: number;
  exclusive?: boolean;
}

export interface OptionGroupDto {
  id: string;
  name: LocalizedText;
  required: boolean;
  multiple: boolean;
  choices: OptionChoiceDto[];
}

export interface DishDto {
  id: string;
  slug: string;
  categoryId: string;
  name: LocalizedText;
  description: LocalizedText;
  price: number;
  emoji: string;
  gradient: string;
  tags?: Record<string, string[]>;
  ingredients: DishIngredientDto[];
  optionGroups?: OptionGroupDto[];
  relatedDishIds?: string[];
  featured?: boolean;
}

export interface MenuResponseDto {
  restaurant: RestaurantDto;
  categories: CategoryDto[];
  dishes: DishDto[];
}
