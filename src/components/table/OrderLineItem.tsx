"use client";

import type { ComponentType } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatPrice } from "@/lib/format";
import { CheckIcon } from "@/components/icons";
import { PotIcon, BellIcon } from "./tableIcons";
import type { TranslationKey } from "@/i18n/translations";
import type { KitchenStatus, OrderItem } from "@/types/table";

const STATUS_ICON: Record<KitchenStatus, ComponentType<{ className?: string }>> = {
  accepted: CheckIcon,
  preparing: PotIcon,
  ready: BellIcon,
};

const STATUS_LABEL_KEY: Record<KitchenStatus, TranslationKey> = {
  accepted: "table.statusAccepted",
  preparing: "table.statusPreparing",
  ready: "table.statusReady",
};

const STATUS_TONE: Record<KitchenStatus, string> = {
  accepted: "bg-ink-100 text-ink-600",
  preparing: "bg-accent-50 text-accent-700",
  ready: "bg-sage-100 text-sage-700",
};

/** Read-only - once sent to the kitchen an item's quantity/options can't be edited here. */
export function OrderLineItem({ item }: { item: OrderItem }) {
  const { text, t } = useLocale();
  const summary = text(item.selectionsSummary);
  const excludedSummary = text(item.excludedIngredientsSummary);
  const Icon = STATUS_ICON[item.status];

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
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${STATUS_TONE[item.status]}`}
          >
            <Icon className="h-3 w-3" />
            {t(STATUS_LABEL_KEY[item.status])}
          </span>
        </div>

        {summary && <p className="text-xs leading-relaxed text-ink-500">{summary}</p>}
        {excludedSummary && (
          <p className="text-xs leading-relaxed text-accent-600">{excludedSummary}</p>
        )}

        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm tabular-nums text-ink-500">× {item.quantity}</span>
          <span className="font-display font-semibold tabular-nums text-ink-900">
            {formatPrice(item.unitPrice * item.quantity)}
          </span>
        </div>
      </div>
    </li>
  );
}
