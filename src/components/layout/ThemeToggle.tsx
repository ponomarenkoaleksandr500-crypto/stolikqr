"use client";

import { useTheme, type ThemeMode } from "@/theme/ThemeProvider";
import { useLocale } from "@/i18n/LocaleProvider";
import { AutoThemeIcon, MoonIcon, SunIcon } from "@/components/icons";

const ICONS: Record<ThemeMode, (props: { className?: string }) => React.ReactElement> = {
  system: AutoThemeIcon,
  light: SunIcon,
  dark: MoonIcon,
};

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  system: "light",
  light: "dark",
  dark: "system",
};

/**
 * Guest-facing light/dark control (design-contract.md §5).
 *
 * `variant="scrim"` is for the restaurant header, where the control sits
 * on a photograph: it needs its own light-on-dark treatment in BOTH
 * modes, because a scrim over an image does not invert with the theme.
 */
export function ThemeToggle({ variant = "surface" }: { variant?: "surface" | "scrim" }) {
  const { mode, resolved, setMode } = useTheme();
  const { t } = useLocale();
  const Icon = ICONS[mode];

  const onScrim = variant === "scrim";

  return (
    <button
      type="button"
      onClick={() => setMode(NEXT_MODE[mode])}
      title={t(`theme.${mode}`)}
      aria-label={`${t(`theme.${mode}`)} — ${t(`theme.switchTo.${NEXT_MODE[mode]}`)}`}
      className={`inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 ${
        onScrim
          ? "border-white/20 bg-white/10 text-on-scrim hover:bg-white/20 focus-visible:ring-offset-transparent"
          : "border-ink-200 bg-surface text-ink-600 hover:border-ink-300 hover:text-ink-900 focus-visible:ring-offset-paper"
      }`}
    >
      <Icon className="h-[18px] w-[18px]" />
      {/* The resolved mode is announced separately so a screen-reader user
          knows what "system" currently means, not just that it is set. */}
      <span className="sr-only">{t(`theme.resolved.${resolved}`)}</span>
    </button>
  );
}
