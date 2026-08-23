"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { CartButton } from "@/components/cart/CartButton";
import { ClockIcon, PinIcon } from "@/components/icons";
import type { Restaurant } from "@/types/menu";

export function RestaurantHeader({ restaurant }: { restaurant: Restaurant }) {
  const { text, t } = useLocale();
  const name = text(restaurant.name);
  const monogram = name.trim().charAt(0).toUpperCase();

  return (
    <header className="relative overflow-hidden rounded-b-[2rem] bg-ink-950 px-4 pb-7 pt-5 text-paper">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent-500/25 blur-3xl"
      />
      <div className="bg-grain pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto flex max-w-2xl flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-500 font-display text-lg font-semibold text-white">
            {monogram}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <CartButton />
            <LanguageSwitcher />
          </div>
        </div>

        <div>
          <h1 className="text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {name}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-paper/70">
            {text(restaurant.description)}
          </p>
        </div>

        <dl className="flex flex-wrap gap-2 text-xs font-medium text-paper/80">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
            <PinIcon className="h-3.5 w-3.5 shrink-0 text-accent-300" />
            <dt className="sr-only">{t("restaurant.address")}</dt>
            <dd>{text(restaurant.address)}</dd>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
            <ClockIcon className="h-3.5 w-3.5 shrink-0 text-accent-300" />
            <dt className="sr-only">{t("restaurant.workingHours")}</dt>
            <dd>{text(restaurant.workingHours)}</dd>
          </div>
        </dl>
      </div>
    </header>
  );
}
