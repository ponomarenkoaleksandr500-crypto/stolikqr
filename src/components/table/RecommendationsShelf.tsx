"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { formatPrice } from "@/lib/format";
import type { Dish } from "@/types/menu";

/**
 * A compact horizontal shelf, not a feed: fixed set, no autoplay, no loop -
 * refreshes only when the caller's `dishes` list changes (i.e. order contents).
 */
export function RecommendationsShelf({
  title,
  dishes,
  onSelect,
}: {
  title: string;
  dishes: Dish[];
  onSelect: (dish: Dish) => void;
}) {
  const { text } = useLocale();

  if (dishes.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">{title}</h3>
      <div className="no-scrollbar mt-2.5 flex gap-3 overflow-x-auto pb-1">
        {dishes.map((dish) => (
          <button
            key={dish.id}
            type="button"
            onClick={() => onSelect(dish)}
            className="flex w-28 shrink-0 flex-col overflow-hidden rounded-2xl border border-ink-100 bg-surface text-left transition-colors hover:border-ink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
          >
            <div
              className={`flex h-16 items-center justify-center bg-gradient-to-br text-2xl ${dish.gradient}`}
            >
              <span role="img" aria-hidden="true">
                {dish.emoji}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 px-2.5 py-2">
              <span className="line-clamp-1 text-xs font-semibold text-ink-800">
                {text(dish.name)}
              </span>
              <span className="text-xs font-medium tabular-nums text-ink-500">
                {formatPrice(dish.price)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
