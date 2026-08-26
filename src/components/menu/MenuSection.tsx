"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { DishCard } from "./DishCard";
import type { Category, Dish } from "@/types/menu";

export function MenuSection({
  category,
  dishes,
  onSelectDish,
}: {
  category: Category;
  dishes: Dish[];
  onSelectDish: (dish: Dish) => void;
}) {
  const { text } = useLocale();

  if (dishes.length === 0) return null;

  return (
    <section className="px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-baseline gap-3">
          <h2 className="font-display text-2xl font-semibold text-ink-900">
            {text(category.name)}
          </h2>
          <span className="h-px flex-1 bg-ink-100" aria-hidden="true" />
          <span className="text-sm font-medium tabular-nums text-ink-600">{dishes.length}</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {dishes.map((dish) => (
            <DishCard key={dish.id} dish={dish} onSelect={onSelectDish} />
          ))}
        </div>
      </div>
    </section>
  );
}
