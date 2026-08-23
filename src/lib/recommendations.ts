import type { CartItem } from "@/cart/types";
import type { Order } from "@/types/table";
import type { Dish } from "@/types/menu";

/** Dishes already in the submitted order or the pending cart - never worth re-suggesting. */
export function getExcludedDishIds(order: Order | null, cartItems: CartItem[]): string[] {
  return [
    ...(order ? order.items.map((item) => item.dishId) : []),
    ...cartItems.map((item) => item.dishId),
  ];
}

/**
 * v1 recommendations: no ML, no engine - just each dish's manually curated
 * `relatedDishIds`, with a `featured` fallback when the order is still empty
 * or there aren't enough related dishes to fill the shelf.
 */
export function getRecommendedDishes(
  allDishes: Dish[],
  orderedDishIds: string[],
  limit = 6,
): Dish[] {
  const byId = new Map(allDishes.map((dish) => [dish.id, dish]));
  const orderedSet = new Set(orderedDishIds);
  const picked: Dish[] = [];
  const pickedIds = new Set<string>();

  const tryAdd = (dish: Dish | undefined) => {
    if (!dish || pickedIds.has(dish.id) || orderedSet.has(dish.id)) return;
    picked.push(dish);
    pickedIds.add(dish.id);
  };

  for (const dishId of orderedDishIds) {
    const dish = byId.get(dishId);
    for (const relatedId of dish?.relatedDishIds ?? []) {
      if (picked.length >= limit) break;
      tryAdd(byId.get(relatedId));
    }
    if (picked.length >= limit) break;
  }

  if (picked.length < limit) {
    for (const dish of allDishes) {
      if (picked.length >= limit) break;
      if (dish.featured) tryAdd(dish);
    }
  }

  if (picked.length < limit) {
    for (const dish of allDishes) {
      if (picked.length >= limit) break;
      tryAdd(dish);
    }
  }

  return picked.slice(0, limit);
}
