"use client";

import { useTheme } from "@/theme/ThemeProvider";
import { useLocale } from "@/i18n/LocaleProvider";
import { MoonIcon, SunIcon } from "@/components/icons";

/**
 * Two states, nothing else: light and dark (sun / moon).
 *
 * The icon shows the CURRENT mode - a moon means "you are in dark" - and
 * the accessible label carries the action, so a screen-reader user is not
 * left guessing whether the icon is a state or a button.
 *
 * `variant="scrim"` is for the restaurant header, where the control sits on
 * a photograph: it needs its own light-on-dark treatment in BOTH modes,
 * because a scrim over an image does not invert with the theme.
 */
export function ThemeToggle({ variant = "surface" }: { variant?: "surface" | "scrim" }) {
  const { mode, toggle } = useTheme();
  const { t } = useLocale();

  const isDark = mode === "dark";
  const Icon = isDark ? MoonIcon : SunIcon;
  const onScrim = variant === "scrim";

  return (
    <button
      type="button"
      onClick={toggle}
      title={t(isDark ? "theme.dark" : "theme.light")}
      aria-label={`${t(isDark ? "theme.dark" : "theme.light")} — ${t(
        isDark ? "theme.switchTo.light" : "theme.switchTo.dark",
      )}`}
      aria-pressed={isDark}
      className={`inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 ${
        onScrim
          ? "border-white/20 bg-white/10 text-on-scrim hover:bg-white/20 focus-visible:ring-offset-transparent"
          : "border-ink-200 bg-surface text-ink-600 hover:border-ink-300 hover:text-ink-900 focus-visible:ring-offset-paper"
      }`}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}
