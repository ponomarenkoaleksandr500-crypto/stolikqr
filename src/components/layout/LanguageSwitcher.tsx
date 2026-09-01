"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/types";

const OPTIONS: Locale[] = ["uk", "en"];

/**
 * `variant="scrim"` is for the restaurant header, where this sits on a
 * photograph and must stay light-on-dark in BOTH modes. Everywhere else
 * it sits on a normal surface and follows the theme like any other
 * control - the table home screen is the case that makes the distinction
 * necessary.
 */
export function LanguageSwitcher({ variant = "surface" }: { variant?: "surface" | "scrim" }) {
  const { locale, setLocale, t } = useLocale();
  const onScrim = variant === "scrim";

  return (
    <div
      className={`inline-flex items-center rounded-full border p-1 ${
        onScrim ? "border-white/20 bg-white/10" : "border-ink-200 bg-surface"
      }`}
    >
      {OPTIONS.map((option) => {
        const active = locale === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setLocale(option)}
            aria-pressed={active}
            className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full px-3 text-xs font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 ${
              onScrim
                ? active
                  ? "bg-on-scrim text-scrim"
                  : "text-on-scrim/70 hover:text-on-scrim"
                : active
                  ? "bg-ink-950 text-paper"
                  : "text-ink-600 hover:text-ink-900"
            }`}
          >
            {option === "uk" ? "UA" : "EN"}
          </button>
        );
      })}
      <span className="sr-only">{t("language.switchTo")}</span>
    </div>
  );
}
