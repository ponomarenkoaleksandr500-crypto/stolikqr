"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { formatPrice } from "@/lib/format";
import { ChevronRightIcon, LeafIcon } from "@/components/icons";
import type { Dish } from "@/types/menu";

export function DishCard({ dish, onSelect }: { dish: Dish; onSelect: (dish: Dish) => void }) {
  const { locale, text } = useLocale();
  const primaryTag = dish.tags?.[locale]?.[0];

  return (
    <article className="flex flex-col rounded-3xl border border-ink-100 bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-lg hover:shadow-ink-900/5">
      <button
        type="button"
        onClick={() => onSelect(dish)}
        className="group block w-full cursor-pointer rounded-t-3xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
      >
        <div
          className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-t-3xl bg-gradient-to-br text-6xl leading-none ${dish.gradient}`}
        >
          <span role="img" aria-hidden="true" className="drop-shadow-sm">
            {dish.emoji}
          </span>
          {primaryTag && (
            <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-sage-700 backdrop-blur-sm">
              <LeafIcon className="h-3 w-3" />
              {primaryTag}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1 px-4 pt-4">
          <h3 className="font-display text-base font-semibold leading-snug text-ink-900">
            {text(dish.name)}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-ink-500">
            {text(dish.description)}
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelect(dish)}
        className="group flex cursor-pointer items-center justify-between rounded-b-3xl px-4 pb-4 pt-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
      >
        <span className="font-display text-lg font-semibold tabular-nums text-ink-900">
          {formatPrice(dish.price)}
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-50 text-ink-500 transition-colors group-hover:bg-accent-50 group-hover:text-accent-600">
          <ChevronRightIcon className="h-4 w-4" />
        </span>
      </button>
    </article>
  );
}
