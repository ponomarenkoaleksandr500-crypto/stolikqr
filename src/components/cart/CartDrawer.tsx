"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatPrice } from "@/lib/format";
import { useDialog } from "@/lib/useDialog";
import { useCart } from "@/cart/CartProvider";
import { CloseIcon, UtensilsIcon } from "@/components/icons";
import { CartLineItem } from "./CartLineItem";
import { useTableSession } from "@/table/TableSessionProvider";
import { useOrder } from "@/table/useOrder";
import { getOrderTotals, isOrderActive, isOrderEmpty, isOrderSettled } from "@/table/orderStatus";
import { ReceiptCheckIcon } from "@/components/table/tableIcons";
import { OrderLineItem } from "@/components/table/OrderLineItem";
import { RecommendationsShelf } from "@/components/table/RecommendationsShelf";
import { useDishSelection } from "@/components/menu/useDishSelection";
import { DishModal } from "@/components/menu/DishModal";
import { PaymentMethodSheet } from "./PaymentMethodSheet";
import { getExcludedDishIds, getRecommendedDishes } from "@/lib/recommendations";
import type { Dish } from "@/types/menu";

export function CartDrawer({ onClose, dishes }: { onClose: () => void; dishes: Dish[] }) {
  const { t } = useLocale();
  const { items, totalPrice, clearCart } = useCart();
  const { dialogRef, closing, requestClose } = useDialog(onClose);
  const { isTableMode, session } = useTableSession();
  const { order, submitCartItems } = useOrder();
  const { selectedDish, setSelectedDish, excludedByDish, toggleIngredient } = useDishSelection();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  const hasSubmittedItems = !isOrderEmpty(order);
  const showPaidState = isOrderSettled(order, items.length);
  const nothingAtAll = !hasSubmittedItems && items.length === 0;

  const excludedDishIds = getExcludedDishIds(order, items);
  const recommended = getRecommendedDishes(dishes, excludedDishIds, 4);

  const handlePlaceOrder = async () => {
    if (!session || items.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitFailed(false);
    const succeeded = await submitCartItems(items, session.id);
    setIsSubmitting(false);
    if (succeeded) clearCart();
    else setSubmitFailed(true);
  };

  const heading = isTableMode ? t("table.order") : t("cart.title");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className={`absolute inset-0 bg-scrim/55 ${
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
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-lg bg-surface outline-none sm:max-w-lg sm:rounded-lg ${
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
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-600">
                      {t("table.order")}
                    </h3>
                    <ul className="divide-y divide-ink-100">
                      {order.items.map((item) => (
                        <OrderLineItem key={item.id} item={item} />
                      ))}
                    </ul>
                    {/* An order stays "active" after payment now, because the
                        guest is still waiting for the kitchen. Without this
                        guard the pay button would stay live on an order that
                        is already settled and invite paying twice. */}
                    {order.paidAt ? (
                      <p className="mt-3 flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-sage-100 px-4 text-sm font-semibold text-sage-700">
                        <ReceiptCheckIcon className="h-4 w-4" />
                        {t("table.paidAlready")} · {formatPrice(getOrderTotals(order).total)}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowPaymentSheet(true)}
                        className="mt-3 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full border border-ink-200 px-4 text-sm font-semibold text-ink-800 transition-colors hover:border-accent-300 hover:bg-accent-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
                      >
                        {t("payment.payButton")} · {formatPrice(getOrderTotals(order).total)}
                      </button>
                    )}
                  </div>
                )}
                {items.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-600">
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
                onClick={() => void handlePlaceOrder()}
                disabled={isSubmitting}
                className="flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full bg-accent-600 px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {t("table.placeOrder")}
              </button>
              {submitFailed && (
                <p className="text-center text-xs font-medium text-danger-600">
                  {t("table.orderPlacementFailed")}
                </p>
              )}
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

      {showPaymentSheet && order && (
        <PaymentMethodSheet
          amount={getOrderTotals(order).total}
          onClose={() => setShowPaymentSheet(false)}
        />
      )}
    </div>
  );
}
