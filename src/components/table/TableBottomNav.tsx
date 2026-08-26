"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/i18n/LocaleProvider";
import { useCart } from "@/cart/CartProvider";
import { useOrder } from "@/table/useOrder";
import { CartIcon } from "@/components/icons";
import { TableIcon, MenuListIcon } from "./tableIcons";

export function TableBottomNav({
  restaurantSlug,
  tableCode,
  firstCategorySlug,
}: {
  restaurantSlug: string;
  tableCode: string;
  firstCategorySlug: string;
}) {
  const pathname = usePathname();
  const { t } = useLocale();
  const { totalCount: cartCount, open } = useCart();
  const { order } = useOrder();

  const orderCount = order ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
  const badgeCount = cartCount + orderCount;

  const tableHref = `/r/${restaurantSlug}/t/${tableCode}`;
  const menuHref = `/r/${restaurantSlug}/${firstCategorySlug}`;
  const isTableActive = pathname === tableHref;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-surface pb-[env(safe-area-inset-bottom)]"
      aria-label={t("table.order")}
    >
      <div className="mx-auto flex max-w-2xl items-stretch">
        <Link
          href={tableHref}
          aria-current={isTableActive ? "page" : undefined}
          className={`flex min-h-[3.5rem] flex-1 cursor-pointer flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-inset ${
            isTableActive ? "text-accent-600" : "text-ink-600 hover:text-ink-600"
          }`}
        >
          <TableIcon className="h-5 w-5" />
          {t("table.nav.table")}
        </Link>
        <Link
          href={menuHref}
          aria-current={!isTableActive ? "page" : undefined}
          className={`flex min-h-[3.5rem] flex-1 cursor-pointer flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-inset ${
            !isTableActive ? "text-accent-600" : "text-ink-600 hover:text-ink-600"
          }`}
        >
          <MenuListIcon className="h-5 w-5" />
          {t("table.nav.menu")}
        </Link>
        <button
          type="button"
          onClick={open}
          className="flex min-h-[3.5rem] flex-1 cursor-pointer flex-col items-center justify-center gap-1 text-xs font-semibold text-ink-600 transition-colors hover:text-ink-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-inset"
        >
          <span className="relative">
            <CartIcon className="h-5 w-5" />
            {badgeCount > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-bold text-white">
                {badgeCount}
              </span>
            )}
          </span>
          {t("table.nav.order")}
        </button>
      </div>
    </nav>
  );
}
