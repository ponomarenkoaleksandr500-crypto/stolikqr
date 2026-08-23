"use client";

import { useState } from "react";
import { toggleIngredientExclusion } from "@/lib/dishIngredients";
import type { Dish } from "@/types/menu";

/**
 * Shared "which dish is open in DishModal, with which ingredients excluded"
 * state. Extracted from CategoryPage so other surfaces (Digital Table's
 * recommendations shelf) can open the same DishModal without a second,
 * duplicate state system.
 */
export function useDishSelection() {
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [excludedByDish, setExcludedByDish] = useState<Record<string, string[]>>({});

  const toggleIngredient = (dishId: string, ingredientId: string) => {
    setExcludedByDish((prev) => ({
      ...prev,
      [dishId]: toggleIngredientExclusion(prev[dishId] ?? [], ingredientId),
    }));
  };

  return { selectedDish, setSelectedDish, excludedByDish, toggleIngredient };
}
