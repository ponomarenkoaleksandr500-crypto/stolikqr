"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { useCart } from "@/cart/CartProvider";
import { CartIcon } from "@/components/icons";

export function CartButton() {
  const { t } = useLocale();
  const { totalCount, open } = useCart();

  return (
    <button
      type="button"
      onClick={open}
      aria-label={t("cart.open")}
      className="relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/10 text-paper transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
    >
      <CartIcon className="h-5 w-5" />
      {totalCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-semibold text-white ring-2 ring-ink-950">
          {totalCount}
        </span>
      )}
    </button>
  );
}
