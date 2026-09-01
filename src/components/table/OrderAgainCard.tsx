"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatPrice } from "@/lib/format";
import type { OrderResponse } from "@/lib/api";

/**
 * Shows the table's last order and repeats it in one tap. The button only
 * ever sends a guestSessionId - the backend derives item ids from the old
 * order and re-validates/re-prices everything against the live menu (see
 * orderStore.reorderLast / OrdersService.reorder), so nothing here trusts
 * lastOrder.items[].lineTotal as anything but a preview of what it *was*.
 */
export function OrderAgainCard({
  lastOrder,
  onReorder,
}: {
  lastOrder: OrderResponse;
  onReorder: () => Promise<boolean>;
}) {
  const { text, t } = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  const total = lastOrder.items.reduce((sum, item) => sum + item.lineTotal, 0);

  const handleClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFailed(false);
    const ok = await onReorder();
    setIsSubmitting(false);
    if (!ok) setFailed(true);
  };

  return (
    <div className="rounded-lg border border-ink-100 bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
        {t("table.orderAgainTitle")}
      </p>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        {lastOrder.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-ink-700">
              {item.quantity} × {text(item.name)}
            </span>
            <span className="shrink-0 tabular-nums text-ink-500">
              {formatPrice(item.lineTotal)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="font-display text-lg font-bold tabular-nums text-ink-900">
          {formatPrice(total)}
        </span>
        <button
          type="button"
          onClick={() => void handleClick()}
          disabled={isSubmitting}
          className="flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-accent-600 px-5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {t("table.orderAgainButton")}
        </button>
      </div>
      {failed && (
        <p className="mt-2 text-xs font-medium text-danger-600">{t("table.orderPlacementFailed")}</p>
      )}
    </div>
  );
}
