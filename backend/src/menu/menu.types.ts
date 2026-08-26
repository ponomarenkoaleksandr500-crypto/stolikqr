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
  /** One of THEME_KEYS (see menu.service.ts) - drives data-theme across guest/waiter/admin. */
  themeKey: string;
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
  /** Admin-set "constant" flag - false means the guest can see but not exclude it. */
  removable: boolean;
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
  photoUrl?: string;
  tags?: Record<string, string[]>;
  ingredients: DishIngredientDto[];
  optionGroups?: OptionGroupDto[];
  relatedDishIds?: string[];
  featured?: boolean;
  isAvailable: boolean;
}

export interface MenuResponseDto {
  restaurant: RestaurantDto;
  categories: CategoryDto[];
  dishes: DishDto[];
}

/** Waiter App stop-list: one row per dish, flattened with its category name for display. */
export interface StaffDishDto {
  id: string;
  name: LocalizedText;
  categoryName: LocalizedText;
  isAvailable: boolean;
}

// --- Admin App: menu editor -------------------------------------------------

export interface AdminCategoryDto {
  id: string;
  slug: string;
  name: LocalizedText;
  /** So the editor can explain *why* delete is refused instead of just failing. */
  dishCount: number;
}

export interface AdminDishSummaryDto {
  id: string;
  slug: string;
  name: LocalizedText;
  categoryId: string;
  price: number;
  emoji: string;
  photoUrl?: string;
  isAvailable: boolean;
  featured: boolean;
}
