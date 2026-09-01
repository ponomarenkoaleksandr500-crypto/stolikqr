"use client";

import Image from "next/image";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatPrice } from "@/lib/format";
import { ChevronRightIcon, LeafIcon, PlateIcon } from "@/components/icons";
import type { Dish } from "@/types/menu";

/**
 * One dish, one control.
 *
 * Fixed here against reports/design-audit.md:
 * - VIS-1: the random per-dish gradient is gone. A dish without a photo
 *   gets a neutral placeholder built from tokens, so it stays inside the
 *   product's single-accent palette in both modes.
 * - VIS-6: this used to render two sibling <button>s that both fired the
 *   identical onSelect(dish) - two controls for one action, and a
 *   keyboard user tabbing through every dish twice. Now one button wraps
 *   the whole card.
 * - VIS-7: emoji no longer stands in for product photography.
 * - VIS-8: the tag and availability pills no longer sit on top of the
 *   photograph; they live in the card body, where their contrast is
 *   defined rather than dependent on whatever the photo happens to be.
 * - VIS-4: radii come from the four-value scale (design-contract.md §4).
 */
export function DishCard({ dish, onSelect }: { dish: Dish; onSelect: (dish: Dish) => void }) {
  const { locale, text, t } = useLocale();
  const primaryTag = dish.tags?.[locale]?.[0];
  const unavailable = !dish.isAvailable;

  return (
    <article className="h-full">
      <button
        type="button"
        disabled={unavailable}
        onClick={() => onSelect(dish)}
        className={`group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-lg border border-ink-100 bg-surface text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${
          unavailable ? "cursor-not-allowed" : "hover:border-ink-200"
        }`}
      >
        <div
          className={`relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-ink-50 ${
            unavailable ? "grayscale" : ""
          }`}
        >
          {dish.photoUrl ? (
            <Image
              src={dish.photoUrl}
              alt={text(dish.name)}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover object-bottom"
            />
          ) : (
            // Honest empty slot. Not an emoji, not a fabricated gradient -
            // a dish simply has no photograph yet.
            <PlateIcon className="h-9 w-9 text-ink-300" />
          )}
        </div>

        <div className={`flex flex-1 flex-col gap-1.5 p-3 ${unavailable ? "opacity-60" : ""}`}>
          {(unavailable || primaryTag) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {unavailable ? (
                <span className="inline-flex items-center rounded-sm bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">
                  {t("dish.unavailable")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-sm bg-sage-100 px-2 py-0.5 text-[11px] font-semibold text-sage-700">
                  <LeafIcon className="h-3 w-3" />
                  {primaryTag}
                </span>
              )}
            </div>
          )}

          <h3 className="font-display text-base font-semibold leading-snug tracking-tight text-ink-900">
            {text(dish.name)}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-ink-500">
            {text(dish.description)}
          </p>

          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <span className="font-display text-lg font-bold tabular-nums text-ink-900">
              {formatPrice(dish.price)}
            </span>
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-50 text-ink-500 transition-colors group-hover:bg-accent-50 group-hover:text-accent-700"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </span>
          </div>
        </div>
      </button>
    </article>
  );
}
