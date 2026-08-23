import type { Locale, LocalizedText } from "@/i18n/types";

export interface OptionChoice {
  id: string;
  name: LocalizedText;
  priceDelta: number;
  /**
   * Only meaningful within a `multiple: true` group. Selecting an exclusive
   * choice clears every other selection in the group; selecting any
   * non-exclusive choice clears the exclusive one. See src/lib/dishOptions.ts.
   */
  exclusive?: boolean;
}

export interface OptionGroup {
  id: string;
  name: LocalizedText;
  required: boolean;
  multiple: boolean;
  choices: OptionChoice[];
}

/**
 * Keys into the ingredient icon registry (src/components/ingredientIcons.tsx).
 * "generic" is the fallback for anything without a dedicated glyph yet -
 * new ingredients don't require a new icon before they can be used.
 */
export type IngredientIcon =
  | "bread"
  | "tomato"
  | "garlic"
  | "basil"
  | "oliveOil"
  | "meat"
  | "cheese"
  | "mushroom"
  | "onion"
  | "pepper"
  | "fish"
  | "seafood"
  | "egg"
  | "pasta"
  | "generic";

/**
 * A single component ingredient of a dish. Distinct from OptionGroup/OptionChoice:
 * ingredients are already part of the base dish and can only be included/excluded
 * (no price impact), while option groups are separate paid/required choices.
 */
export interface DishIngredient {
  id: string;
  name: LocalizedText;
  icon: IngredientIcon;
}

export interface Dish {
  id: string;
  slug: string;
  categoryId: string;
  name: LocalizedText;
  description: LocalizedText;
  price: number;
  emoji: string;
  gradient: string;
  ingredients: DishIngredient[];
  tags?: Record<Locale, string[]>;
  optionGroups?: OptionGroup[];
  /**
   * Manually curated pairing, e.g. "guests who order this also order that" -
   * the v1 recommendation source (see src/lib/recommendations.ts). No ML,
   * no engine: the restaurant edits this list directly.
   */
  relatedDishIds?: string[];
  /** Shown as a fallback "popular" pick when the guest's order is still empty. */
  featured?: boolean;
}

export interface Category {
  id: string;
  slug: string;
  name: LocalizedText;
}

export interface Restaurant {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  address: LocalizedText;
  workingHours: LocalizedText;
}
