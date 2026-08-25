"use client";

import { useEffect } from "react";
import { MenuSection } from "./MenuSection";
import { DishModal } from "./DishModal";
import { useDishSelection } from "./useDishSelection";
import { useAnalytics } from "@/lib/analytics";
import type { Category, Dish } from "@/types/menu";

export function CategoryPage({
  category,
  dishes,
}: {
  category: Category;
  dishes: Dish[];
}) {
  const { selectedDish, setSelectedDish, excludedByDish, toggleIngredient } = useDishSelection();
  const { track } = useAnalytics();

  // CategoryPage is a page component under the shared RestaurantShell layout,
  // so unlike RestaurantShell's one-time MENU_OPENED it remounts on every
  // category navigation - exactly the "one view per category visit" this event means.
  useEffect(() => {
    track("CATEGORY_VIEWED", { payload: { categorySlug: category.slug } });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per category mount only
  }, [category.slug]);

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
