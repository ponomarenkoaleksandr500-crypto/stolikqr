"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { formatPrice } from "@/lib/format";
import { MinusIcon, PlusIcon, TrashIcon } from "@/components/icons";
import type { CartItem } from "@/cart/types";
import { useCart } from "@/cart/CartProvider";
import { useAnalytics } from "@/lib/analytics";

export function CartLineItem({ item }: { item: CartItem }) {
  const { text, t } = useLocale();
  const { incrementItem, decrementItem, removeItem } = useCart();
  const { track } = useAnalytics();
  const summary = text(item.selectionsSummary);
  const excludedSummary = text(item.excludedIngredientsSummary);

  const handleRemove = () => {
    track("DISH_REMOVED_FROM_CART", { dishId: item.dishId });
    removeItem(item.id);
  };

  return (
    <li className="flex gap-3 py-4">
      <div
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl leading-none ${item.gradient}`}
      >
        <span role="img" aria-hidden="true">
          {item.emoji}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <span className="font-display font-semibold text-ink-900">{text(item.dishName)}</span>
          <button
            type="button"
            onClick={handleRemove}
            aria-label={t("cart.remove")}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-50 hover:text-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>

        {summary && <p className="text-xs leading-relaxed text-ink-500">{summary}</p>}
        {excludedSummary && (
          <p className="text-xs leading-relaxed text-accent-600">{excludedSummary}</p>
        )}

        <div className="mt-1 flex items-center justify-between">
          <div className="inline-flex items-center rounded-full border border-ink-200">
            <button
              type="button"
              onClick={() => decrementItem(item.id)}
              disabled={item.quantity <= 1}
              aria-label={t("cart.decrease")}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <MinusIcon className="h-4 w-4" />
            </button>
            <span className="min-w-6 text-center text-sm font-semibold tabular-nums text-ink-900">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => incrementItem(item.id)}
              aria-label={t("cart.increase")}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          <span className="font-display font-semibold tabular-nums text-ink-900">
            {formatPrice(item.unitPrice * item.quantity)}
          </span>
        </div>
      </div>
    </li>
  );
}
