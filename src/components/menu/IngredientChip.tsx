"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { IngredientGlyph } from "@/components/ingredientIcons";
import { PlusIcon } from "@/components/icons";
import type { DishIngredient } from "@/types/menu";

/**
 * Toggleable ingredient pill shared by DishCard and DishModal, so both
 * surfaces read/write the same excluded-ingredient state consistently.
 */
export function IngredientChip({
  ingredient,
  excluded,
  onToggle,
  size = "md",
}: {
  ingredient: DishIngredient;
  excluded: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
}) {
  const { text, t } = useLocale();
  const isSmall = size === "sm";

  // Admin-marked "constant" ingredients are shown but can't be excluded - no
  // button semantics, no toggle icon, just a static pill (see menu editor).
  if (!ingredient.removable) {
    return (
      <span
        className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-ink-200 bg-surface font-medium text-ink-700 ${
          isSmall ? "px-2.5 text-[11px]" : "px-3 text-xs"
        }`}
      >
        <IngredientGlyph
          icon={ingredient.icon}
          className={`shrink-0 text-accent-600 ${isSmall ? "h-3.5 w-3.5" : "h-4 w-4"}`}
        />
        {text(ingredient.name)}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      aria-pressed={!excluded}
      aria-label={`${text(ingredient.name)} — ${
        excluded ? t("dish.ingredientExcluded") : t("dish.ingredientIncluded")
      }`}
      className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 ${
        isSmall ? "px-2.5 text-[11px]" : "px-3 text-xs"
      } ${
        excluded
          ? "border-ink-200 bg-ink-50 text-ink-600"
          : "border-ink-200 bg-surface text-ink-700 hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700"
      }`}
    >
      <IngredientGlyph
        icon={ingredient.icon}
        className={`shrink-0 ${isSmall ? "h-3.5 w-3.5" : "h-4 w-4"} ${
          excluded ? "text-ink-300" : "text-accent-600"
        }`}
      />
      <span className={excluded ? "decoration-2 line-through decoration-ink-300" : ""}>
        {text(ingredient.name)}
      </span>
      {excluded && (
        <PlusIcon className={`shrink-0 text-ink-400 ${isSmall ? "h-2.5 w-2.5" : "h-3 w-3"}`} />
      )}
    </button>
  );
}
