"use client";

import Link from "next/link";
import { useLocale } from "@/i18n/LocaleProvider";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useCart } from "@/cart/CartProvider";
import { useOrder } from "@/table/useOrder";
import { usePayment } from "@/table/usePayment";
import { useTableSession } from "@/table/TableSessionProvider";
import { isOrderActive, isOrderSettled } from "@/table/orderStatus";
import { getExcludedDishIds, getRecommendedDishes } from "@/lib/recommendations";
import { useDishSelection } from "@/components/menu/useDishSelection";
import { DishModal } from "@/components/menu/DishModal";
import { CloseIcon } from "@/components/icons";
import { ReceiptCheckIcon } from "@/components/table/tableIcons";
import { OrderStatusCard } from "./OrderStatusCard";
import { OrderAgainCard } from "./OrderAgainCard";
import { RecommendationsShelf } from "./RecommendationsShelf";
import type { Dish, Restaurant } from "@/types/menu";

export function DigitalTableHome({
  restaurant,
  tableCode,
  dishes,
  firstCategorySlug,
}: {
  restaurant: Restaurant;
  tableCode: string;
  dishes: Dish[];
  firstCategorySlug: string;
}) {
  const { text, t } = useLocale();
  const { items: cartItems, open: openCart } = useCart();
  const { session } = useTableSession();
  const { order, lastOrder, reorderNotice, reorderLast, dismissReorderNotice } = useOrder();
  const { isPending: isPaymentPending } = usePayment();
  const { selectedDish, setSelectedDish, excludedByDish, toggleIngredient } = useDishSelection();

  const menuHref = `/r/${restaurant.slug}/${firstCategorySlug}`;
  const hasPendingCart = cartItems.length > 0;
  const showPaidState = isOrderSettled(order, cartItems.length);
  const showActiveOrder = isOrderActive(order);
  const excludedDishIds = getExcludedDishIds(order, cartItems);
  const recommended = getRecommendedDishes(dishes, excludedDishIds, 6);
  const shelfTitle =
    excludedDishIds.length > 0 ? t("recommendations.pairsTitle") : t("recommendations.popularTitle");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-5">
      <div className="flex items-center justify-end">
        <LanguageSwitcher />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">
          {t("table.yourTable")}
        </p>
        <p className="font-display text-4xl font-bold leading-none text-ink-950">{tableCode}</p>
      </div>

      {isPaymentPending && (
        <div className="flex items-center gap-3 rounded-2xl border border-accent-200 bg-accent-50 p-4 text-accent-700">
          <span className="flex h-10 w-10 shrink-0 animate-pulse items-center justify-center rounded-full bg-accent-100">
            <ReceiptCheckIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">{t("table.paymentPendingTitle")}</p>
            <p className="text-xs text-accent-700/80">{t("table.paymentPendingHint")}</p>
          </div>
        </div>
      )}

      {reorderNotice.length > 0 && (
        <div className="rounded-2xl border border-accent-200 bg-accent-50 p-4 text-sm text-accent-700">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">{t("table.orderAgainSkippedIntro")}</p>
            <button
              type="button"
              onClick={dismissReorderNotice}
              aria-label={t("dish.close")}
              className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-accent-600 transition-colors hover:bg-accent-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
          <ul className="mt-1.5 list-disc pl-4">
            {reorderNotice.map((item, index) => (
              <li key={index}>
                {item.quantity} × {text(item.name)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showPaidState ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl bg-sage-100 p-5 text-center">
            <p className="font-display text-lg font-semibold text-sage-700">{t("table.paidTitle")}</p>
            <p className="mt-1.5 text-sm text-sage-700/80">{t("table.paidHint")}</p>
          </div>
          {lastOrder && session && (
            <OrderAgainCard lastOrder={lastOrder} onReorder={() => reorderLast(session.id)} />
          )}
          <Link
            href={menuHref}
            className="flex min-h-12 items-center justify-center rounded-2xl border border-ink-200 bg-surface px-4 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
          >
            {t("table.backToMenu")}
          </Link>
        </div>
      ) : showActiveOrder && order ? (
        <>
          <OrderStatusCard order={order} />
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={menuHref}
              className="flex min-h-12 items-center justify-center rounded-2xl border border-ink-200 bg-surface px-4 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
            >
              {t("table.nav.menu")}
            </Link>
            <button
              type="button"
              onClick={openCart}
              className="flex min-h-12 cursor-pointer items-center justify-center rounded-2xl bg-accent-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
            >
              {t("table.addMore")}
            </button>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-surface p-5 text-center">
          <p className="font-display text-lg font-semibold text-ink-900">{t("table.emptyTitle")}</p>
          <p className="mt-1.5 text-sm text-ink-500">{t("table.emptyHint")}</p>
          {hasPendingCart ? (
            <button
              type="button"
              onClick={openCart}
              className="mt-4 inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-accent-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
            >
              {t("table.order")}
            </button>
          ) : (
            <Link
              href={menuHref}
              className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-accent-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
            >
              {t("table.openMenu")}
            </Link>
          )}
        </div>
      )}

      <RecommendationsShelf title={shelfTitle} dishes={recommended} onSelect={setSelectedDish} />

      {selectedDish && (
        <DishModal
          key={selectedDish.id}
          dish={selectedDish}
          excludedIngredientIds={excludedByDish[selectedDish.id] ?? []}
          onToggleIngredient={(ingredientId) => toggleIngredient(selectedDish.id, ingredientId)}
          onClose={() => setSelectedDish(null)}
        />
      )}
    </div>
  );
}
