"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { formatPrice } from "@/lib/format";
import { useDialog } from "@/lib/useDialog";
import { useCart } from "@/cart/CartProvider";
import { CloseIcon, UtensilsIcon } from "@/components/icons";
import { CartLineItem } from "./CartLineItem";
import { useTableSession } from "@/table/TableSessionProvider";
import { useOrder } from "@/table/useOrder";
import { isOrderActive, isOrderEmpty, isOrderSettled } from "@/table/orderStatus";
import { OrderLineItem } from "@/components/table/OrderLineItem";
import { RecommendationsShelf } from "@/components/table/RecommendationsShelf";
import { useDishSelection } from "@/components/menu/useDishSelection";
import { DishModal } from "@/components/menu/DishModal";
import { getExcludedDishIds, getRecommendedDishes } from "@/lib/recommendations";
import type { Dish } from "@/types/menu";

export function CartDrawer({ onClose, dishes }: { onClose: () => void; dishes: Dish[] }) {
  const { t } = useLocale();
  const { items, totalPrice, clearCart } = useCart();
  const { dialogRef, closing, requestClose } = useDialog(onClose);
  const { isTableMode, session, table } = useTableSession();
  const { order, submitCartItems } = useOrder();
  const { selectedDish, setSelectedDish, excludedByDish, toggleIngredient } = useDishSelection();

  const hasSubmittedItems = !isOrderEmpty(order);
  const showPaidState = isOrderSettled(order, items.length);
  const nothingAtAll = !hasSubmittedItems && items.length === 0;

  const excludedDishIds = getExcludedDishIds(order, items);
  const recommended = getRecommendedDishes(dishes, excludedDishIds, 4);

  const handlePlaceOrder = () => {
    if (!session || !table || items.length === 0) return;
    submitCartItems(items, table.id, session.id);
    clearCart();
  };

  const heading = isTableMode ? t("table.order") : t("cart.title");

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
        aria-labelledby="cart-drawer-title"
        tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-surface outline-none sm:max-w-lg sm:rounded-[2rem] ${
          closing ? "animate-sheet-out" : "animate-sheet-in"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-ink-100 px-5 py-4">
          <h2 id="cart-drawer-title" className="font-display text-xl font-semibold text-ink-900">
            {heading}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label={t("dish.close")}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {isTableMode ? (
            showPaidState ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sage-100 text-sage-700">
                  <UtensilsIcon className="h-7 w-7" />
                </span>
                <p className="font-display text-base font-semibold text-ink-800">
                  {t("table.paidTitle")}
                </p>
                <p className="max-w-[24ch] text-sm text-ink-500">{t("table.paidHint")}</p>
              </div>
            ) : nothingAtAll ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-50 text-ink-300">
                  <UtensilsIcon className="h-7 w-7" />
                </span>
                <p className="font-display text-base font-semibold text-ink-800">
                  {t("table.emptyTitle")}
                </p>
                <p className="max-w-[22ch] text-sm text-ink-500">{t("table.emptyHint")}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5 py-4">
                {isOrderActive(order) && order && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                      {t("table.order")}
                    </h3>
                    <ul className="divide-y divide-ink-100">
                      {order.items.map((item) => (
                        <OrderLineItem key={item.id} item={item} />
                      ))}
                    </ul>
                  </div>
                )}
                {items.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                      {t("table.addMore")}
                    </h3>
                    <ul className="divide-y divide-ink-100">
                      {items.map((item) => (
                        <CartLineItem key={item.id} item={item} />
                      ))}
                    </ul>
                  </div>
                )}
                <RecommendationsShelf
                  title={t("recommendations.pairsTitle")}
                  dishes={recommended}
                  onSelect={setSelectedDish}
                />
              </div>
            )
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-50 text-ink-300">
                <UtensilsIcon className="h-7 w-7" />
              </span>
              <p className="font-display text-base font-semibold text-ink-800">{t("cart.empty")}</p>
              <p className="max-w-[22ch] text-sm text-ink-500">{t("cart.emptyHint")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {items.map((item) => (
                <CartLineItem key={item.id} item={item} />
              ))}
            </ul>
          )}
        </div>

        {isTableMode ? (
          items.length > 0 && (
            <div className="flex shrink-0 flex-col gap-3 border-t border-ink-100 bg-surface px-5 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-500">{t("dish.total")}</span>
                <span className="font-display text-xl font-bold tabular-nums text-ink-900">
                  {formatPrice(totalPrice)}
                </span>
              </div>
              <button
                type="button"
                onClick={handlePlaceOrder}
                className="flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full bg-accent-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
              >
                {t("table.placeOrder")}
              </button>
            </div>
          )
        ) : (
          items.length > 0 && (
            <div className="flex shrink-0 items-center justify-between border-t border-ink-100 bg-surface px-5 py-4">
              <span className="text-sm font-medium text-ink-500">{t("dish.total")}</span>
              <span className="font-display text-xl font-bold tabular-nums text-ink-900">
                {formatPrice(totalPrice)}
              </span>
            </div>
          )
        )}
      </div>

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
