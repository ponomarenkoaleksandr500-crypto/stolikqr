"use client";

import Image from "next/image";
import { useLocale } from "@/i18n/LocaleProvider";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { CartButton } from "@/components/cart/CartButton";
import { ClockIcon, PinIcon } from "@/components/icons";
import { getNameMonogram } from "@/lib/format";
import type { Restaurant } from "@/types/menu";

/**
 * The header is the one place in the product that is always dark: it sits
 * over the restaurant's own photography, and a scrim over a photograph
 * does not invert with the theme (design-contract.md §5, Page Theme Lock).
 * That is why it uses --color-scrim / --color-on-scrim rather than the
 * ink ramp, which flips between modes.
 *
 * Removed here (audit VIS-9): the bg-grain noise overlay and the
 * blur-3xl accent glow. Three simultaneous decorative devices were
 * stacked on one element; the gradient scrim stays because it is
 * functional - it is what makes the text legible over an arbitrary photo.
 */
export function RestaurantHeader({ restaurant }: { restaurant: Restaurant }) {
  const { text, t } = useLocale();
  const name = text(restaurant.name);
  const monogram = getNameMonogram(name);

  return (
    <header className="relative overflow-hidden rounded-b-lg bg-scrim px-4 pb-7 pt-5 text-on-scrim">
      {restaurant.coverPhotoUrl ? (
        <>
          <Image
            src={restaurant.coverPhotoUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* Darkens toward the bottom so the name/address/hours stay
              legible over any photograph. Functional, not decorative. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-scrim/50 via-scrim/70 to-scrim"
          />
        </>
      ) : null}

      <div className="relative mx-auto flex max-w-2xl flex-col gap-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-500 font-display text-lg font-bold text-on-accent">
            {monogram}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CartButton />
            <ThemeToggle variant="scrim" />
            <LanguageSwitcher variant="scrim" />
          </div>
        </div>

        <div>
          <h1 className="text-balance font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {name}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-on-scrim/75">
            {text(restaurant.description)}
          </p>
        </div>

        <dl className="flex flex-wrap gap-2 text-xs font-medium text-on-scrim/85">
          <div className="inline-flex items-center gap-1.5 rounded-sm border border-white/15 bg-white/10 px-3 py-1.5">
            <PinIcon className="h-3.5 w-3.5 shrink-0 text-accent-300" />
            <dt className="sr-only">{t("restaurant.address")}</dt>
            <dd>{text(restaurant.address)}</dd>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-sm border border-white/15 bg-white/10 px-3 py-1.5">
            <ClockIcon className="h-3.5 w-3.5 shrink-0 text-accent-300" />
            <dt className="sr-only">{t("restaurant.workingHours")}</dt>
            <dd>{text(restaurant.workingHours)}</dd>
          </div>
        </dl>
      </div>
    </header>
  );
}
