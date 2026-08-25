"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatPrice, formatPriceDelta } from "@/lib/format";
import { useDialog } from "@/lib/useDialog";
import {
  computeDishPrice,
  getMissingRequiredGroups,
  initialSelections,
  toggleChoice,
  type Selections,
} from "@/lib/dishOptions";
import { useCart } from "@/cart/CartProvider";
import { useAnalytics } from "@/lib/analytics";
import { CheckIcon, CloseIcon, LeafIcon } from "@/components/icons";
import { IngredientChip } from "./IngredientChip";
import type { Dish, OptionGroup } from "@/types/menu";

const ADDED_FEEDBACK_MS = 550;

export function DishModal({
  dish,
  excludedIngredientIds,
  onToggleIngredient,
  onClose,
}: {
  dish: Dish;
  excludedIngredientIds: string[];
  onToggleIngredient: (ingredientId: string) => void;
  onClose: () => void;
}) {
  const { locale, text, t } = useLocale();
  const { addItem } = useCart();
  const { track } = useAnalytics();
  const [selections, setSelections] = useState<Selections>(() => initialSelections(dish));
  const [missingGroupIds, setMissingGroupIds] = useState<Set<string>>(() => new Set());
  const [justAdded, setJustAdded] = useState(false);
  const addedTimeoutRef = useRef<number | null>(null);

  const { dialogRef, closing, requestClose } = useDialog(onClose);

  useEffect(() => {
    track("DISH_VIEWED", { dishId: dish.id });
    return () => {
      if (addedTimeoutRef.current) window.clearTimeout(addedTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per dish mount only (DishModal is remounted per dish via `key={selectedDish.id}`)
  }, []);

  const totalPrice = useMemo(() => computeDishPrice(dish, selections), [dish, selections]);

  const handleToggle = (group: OptionGroup, choiceId: string) => {
    setSelections((prev) => ({
      ...prev,
      [group.id]: toggleChoice(group, choiceId, prev[group.id] ?? []),
    }));
    setMissingGroupIds((prev) => {
      if (!prev.has(group.id)) return prev;
      const next = new Set(prev);
      next.delete(group.id);
      return next;
    });
  };

  const handleAddToCart = () => {
    if (justAdded) return;

    const missing = getMissingRequiredGroups(dish, selections);
    if (missing.length > 0) {
      setMissingGroupIds(new Set(missing.map((group) => group.id)));
      return;
    }

    addItem(dish, selections, excludedIngredientIds);
    track("DISH_ADDED_TO_CART", { dishId: dish.id, payload: { quantity: 1 } });
    setJustAdded(true);
    if (addedTimeoutRef.current) window.clearTimeout(addedTimeoutRef.current);
    addedTimeoutRef.current = window.setTimeout(() => {
      requestClose();
    }, ADDED_FEEDBACK_MS);
  };

  const tags = dish.tags?.[locale] ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className={`absolute inset-0 bg-ink-950/55 ${
          closing ? "animate-overlay-out" : "animate-overlay-in"
        }`}
        onClick={requestClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dish-modal-title"
        tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-surface outline-none sm:max-w-lg sm:rounded-[2rem] ${
          closing ? "animate-sheet-out" : "animate-sheet-in"
        }`}
      >
        <div className="relative shrink-0 px-5 pb-4 pt-3">
          <span
            aria-hidden="true"
            className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-ink-200 sm:hidden"
          />
          <div className="flex items-start justify-between gap-3">
            <h2
              id="dish-modal-title"
              className="font-display text-2xl font-semibold text-ink-900"
            >
              {text(dish.name)}
            </h2>
            <button
              type="button"
              onClick={requestClose}
              aria-label={t("dish.close")}
              className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          {tags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-sage-100 px-2.5 py-1 text-xs font-medium text-sage-700"
                >
                  <LeafIcon className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div
          className={`relative flex h-48 shrink-0 items-center justify-center bg-gradient-to-br text-7xl sm:h-56 ${dish.gradient}`}
        >
          <span role="img" aria-hidden="true" className="drop-shadow-sm">
            {dish.emoji}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {dish.ingredients.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                {t("dish.ingredients")}
              </h3>
              <p className="mt-1 text-xs text-ink-400">{t("dish.ingredientsHint")}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {dish.ingredients.map((ingredient) => (
                  <IngredientChip
                    key={ingredient.id}
                    ingredient={ingredient}
                    excluded={excludedIngredientIds.includes(ingredient.id)}
                    onToggle={() => onToggleIngredient(ingredient.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <p className="mt-4 text-sm leading-relaxed text-ink-600">{text(dish.description)}</p>

          {(dish.optionGroups ?? []).map((group) => {
            const currentSelections = selections[group.id] ?? [];
            const groupHasError = missingGroupIds.has(group.id);
            return (
              <div key={group.id} className="mt-6">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-ink-900">{text(group.name)}</h3>
                  <span className="text-xs font-medium text-ink-500">
                    {group.required
                      ? t("dish.required")
                      : group.multiple
                        ? t("dish.chooseAny")
                        : t("dish.chooseOne")}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-col gap-2">
                  {group.choices.map((choice) => {
                    const checked = currentSelections.includes(choice.id);
                    return (
                      <label
                        key={choice.id}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3 text-sm transition-colors ${
                          checked
                            ? "border-accent-500 bg-accent-50"
                            : "border-ink-200 hover:border-ink-300"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                            <input
                              type={group.multiple ? "checkbox" : "radio"}
                              name={group.id}
                              checked={checked}
                              onChange={() => handleToggle(group, choice.id)}
                              className="peer absolute inset-0 h-5 w-5 cursor-pointer opacity-0"
                            />
                            <span
                              aria-hidden="true"
                              className={`flex h-5 w-5 items-center justify-center border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent-500 peer-focus-visible:ring-offset-2 ${
                                group.multiple ? "rounded-md" : "rounded-full"
                              } ${
                                checked
                                  ? "border-accent-500 bg-accent-500"
                                  : "border-ink-300 bg-surface"
                              }`}
                            >
                              {checked && <CheckIcon className="h-3 w-3 text-white" />}
                            </span>
                          </span>
                          <span className="text-ink-800">{text(choice.name)}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-ink-500">
                          {choice.priceDelta === 0
                            ? t("dish.free")
                            : formatPriceDelta(choice.priceDelta)}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {groupHasError && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">
                    {t("cart.requiredMissing")}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-ink-100 bg-surface px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink-500">{t("dish.total")}</span>
            <span className="font-display text-xl font-bold tabular-nums text-ink-900">
              {formatPrice(totalPrice)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={justAdded}
            className={`flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 disabled:cursor-default ${
              justAdded
                ? "bg-sage-600 text-white"
                : "bg-accent-500 text-white hover:bg-accent-600"
            }`}
          >
            {justAdded ? (
              <>
                <CheckIcon className="h-4 w-4" />
                {t("cart.added")}
              </>
            ) : (
              t("cart.addToCart")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
