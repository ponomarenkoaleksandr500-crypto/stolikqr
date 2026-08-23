import { translations } from "@/i18n/translations";
import type { Locale } from "@/i18n/types";
import type { Dish } from "@/types/menu";

/**
 * Base ingredients are toggled included/excluded only - unlike OptionGroup
 * choices (src/lib/dishOptions.ts) they never carry a price delta and are
 * tracked as a plain list of excluded ingredient ids, not a Selections map.
 */
export type ExcludedIngredientIds = string[];

export function toggleIngredientExclusion(
  excludedIds: ExcludedIngredientIds,
  ingredientId: string,
): ExcludedIngredientIds {
  return excludedIds.includes(ingredientId)
    ? excludedIds.filter((id) => id !== ingredientId)
    : [...excludedIds, ingredientId];
}

export function excludedIngredientsKey(excludedIds: ExcludedIngredientIds): string {
  return [...excludedIds].sort().join(",");
}

export function describeExcludedIngredients(
  dish: Dish,
  excludedIds: ExcludedIngredientIds,
  locale: Locale,
): string {
  if (excludedIds.length === 0) return "";
  const names = dish.ingredients
    .filter((ingredient) => excludedIds.includes(ingredient.id))
    .map((ingredient) => ingredient.name[locale]);
  if (names.length === 0) return "";
  return `${translations[locale]["dish.without"]} ${names.join(", ")}`;
}
