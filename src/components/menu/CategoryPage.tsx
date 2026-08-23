"use client";

import { MenuSection } from "./MenuSection";
import { DishModal } from "./DishModal";
import { useDishSelection } from "./useDishSelection";
import type { Category, Dish } from "@/types/menu";

export function CategoryPage({
  category,
  dishes,
}: {
  category: Category;
  dishes: Dish[];
}) {
  const { selectedDish, setSelectedDish, excludedByDish, toggleIngredient } = useDishSelection();

  return (
    <>
      <MenuSection category={category} dishes={dishes} onSelectDish={setSelectedDish} />
      {selectedDish && (
        <DishModal
          key={selectedDish.id}
          dish={selectedDish}
          excludedIngredientIds={excludedByDish[selectedDish.id] ?? []}
          onToggleIngredient={(ingredientId) => toggleIngredient(selectedDish.id, ingredientId)}
          onClose={() => setSelectedDish(null)}
        />
      )}
    </>
  );
}
