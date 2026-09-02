"use client";

import { PlateIcon } from "@/components/icons";
import Image from "next/image";
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
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-600">{title}</h3>
      <div className="no-scrollbar mt-2.5 flex gap-3 overflow-x-auto pb-1">
        {dishes.map((dish) => (
          <button
            key={dish.id}
            type="button"
            onClick={() => onSelect(dish)}
            className="flex w-28 shrink-0 flex-col overflow-hidden rounded-lg border border-ink-100 bg-surface text-left transition-colors hover:border-ink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
          >
            {/*
              w-full is not decorative: WebKit's UA stylesheet sets align-items
              on <button>, so a flex-column button does NOT stretch its children
              the way a <div> does. Without an explicit width this box - whose
              only child is an absolutely positioned fill image - collapsed to
              0px wide in Safari/iOS and the photo simply never appeared, while
              Chrome rendered it fine. Every other photo box in the app
              (DishCard w-full, OrderLineItem/CartLineItem w-16) already sets one.
              aspect-[4/3] matches DishCard, so the shelf shows the same crop of
              the dish as the menu card instead of a wide bottom sliver.
            */}
            <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-ink-50">
              {dish.photoUrl ? (
                <Image src={dish.photoUrl} alt="" fill sizes="112px" className="object-cover object-bottom" />
              ) : (
                <PlateIcon className="h-6 w-6 text-ink-300" />
              )}
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
