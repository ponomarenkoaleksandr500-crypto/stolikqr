"use client";

import Link from "next/link";
import { useLocale } from "@/i18n/LocaleProvider";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useCart } from "@/cart/CartProvider";
import { useOrder } from "@/table/useOrder";
import { isOrderActive, isOrderSettled } from "@/table/orderStatus";
import { getExcludedDishIds, getRecommendedDishes } from "@/lib/recommendations";
import { useDishSelection } from "@/components/menu/useDishSelection";
import { DishModal } from "@/components/menu/DishModal";
import { OrderStatusCard } from "./OrderStatusCard";
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
  const { order } = useOrder();
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
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-500 font-display text-sm font-semibold text-white">
          {text(restaurant.name).trim().charAt(0).toUpperCase()}
        </div>
        <LanguageSwitcher />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
          {t("table.yourTable")}
        </p>
        <p className="font-display text-4xl font-bold leading-none text-ink-950">{tableCode}</p>
      </div>

      {showPaidState ? (
        <div className="rounded-2xl bg-sage-100 p-5 text-center">
          <p className="font-display text-lg font-semibold text-sage-700">{t("table.paidTitle")}</p>
          <p className="mt-1.5 text-sm text-sage-700/80">{t("table.paidHint")}</p>
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
              className="flex min-h-12 cursor-pointer items-center justify-center rounded-2xl bg-accent-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
            >
              {t("table.order")}
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
              className="mt-4 inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full bg-accent-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
            >
              {t("table.order")}
            </button>
          ) : (
            <Link
              href={menuHref}
              className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full bg-accent-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
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
