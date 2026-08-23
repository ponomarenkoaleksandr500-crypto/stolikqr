"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/cart/CartProvider";
import { CartIcon } from "@/components/icons";

export function CartBar() {
  const { t } = useLocale();
  const { items, totalCount, totalPrice, open } = useCart();

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={open}
        aria-label={`${t("cart.viewCart")}: ${totalCount} ${t("cart.itemsLabel")}, ${formatPrice(totalPrice)}`}
        className="animate-bar-in pointer-events-auto flex min-h-14 w-full max-w-2xl cursor-pointer items-center justify-between gap-3 rounded-full bg-ink-950 px-3 py-2.5 text-paper shadow-xl shadow-ink-950/25 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        <span className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-500">
            <CartIcon className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-paper px-1 text-[11px] font-bold text-ink-950 ring-2 ring-ink-950">
              {totalCount}
            </span>
          </span>
          <span className="text-sm font-semibold">{t("cart.viewCart")}</span>
        </span>
        <span className="font-display text-base font-bold tabular-nums pr-2">
          {formatPrice(totalPrice)}
        </span>
      </button>
    </div>
  );
}
