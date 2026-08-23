"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/types";

const OPTIONS: Locale[] = ["uk", "en"];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 p-1">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLocale(option)}
          aria-pressed={locale === option}
          className={`inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full px-3 text-xs font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 ${
            locale === option
              ? "bg-paper text-ink-900"
              : "text-paper/70 hover:text-paper"
          }`}
        >
          {option === "uk" ? "UA" : "EN"}
        </button>
      ))}
      <span className="sr-only">{t("language.switchTo")}</span>
    </div>
  );
}
