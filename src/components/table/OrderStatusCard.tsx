"use client";

import type { ComponentType } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { formatPrice } from "@/lib/format";
import { CheckIcon, UtensilsIcon } from "@/components/icons";
import { PotIcon, BellIcon, ReceiptCheckIcon } from "./tableIcons";
import {
  ORDER_STAGES,
  stageProgressIndex,
  getPrimaryStatus,
  getNewItemsCount,
  getOrderTotals,
} from "@/table/orderStatus";
import type { TranslationKey } from "@/i18n/translations";
import type { Order, OrderStageStatus } from "@/types/table";

const STAGE_ICON: Record<OrderStageStatus, ComponentType<{ className?: string }>> = {
  accepted: CheckIcon,
  preparing: PotIcon,
  ready: BellIcon,
  served: UtensilsIcon,
  paid: ReceiptCheckIcon,
};

const STAGE_LABEL_KEY: Record<OrderStageStatus, TranslationKey> = {
  accepted: "table.statusAccepted",
  preparing: "table.statusPreparing",
  ready: "table.statusReady",
  served: "table.statusServed",
  paid: "table.statusPaid",
};

const STAGE_CAPTION_KEY: Record<OrderStageStatus, TranslationKey> = {
  accepted: "table.statusCaptionAccepted",
  preparing: "table.statusCaptionPreparing",
  ready: "table.statusCaptionReady",
  served: "table.statusCaptionServed",
  paid: "table.statusCaptionPaid",
};

/** The 5-stage progress stepper + summary. Shared by Digital Table Home and the Order sheet. */
export function OrderStatusCard({ order }: { order: Order }) {
  const { t } = useLocale();
  const stage = getPrimaryStatus(order);
  const currentIndex = stageProgressIndex(stage);
  const newItemsCount = getNewItemsCount(order);
  const { count, total } = getOrderTotals(order);

  return (
    <div className="rounded-lg border border-ink-100 bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          {t("table.order")}
        </span>
        <span className="text-sm tabular-nums text-ink-600">
          {count} {t("cart.itemsLabel")} ·{" "}
          <span className="font-display font-bold text-ink-900">{formatPrice(total)}</span>
        </span>
      </div>

      <div className="mt-3.5 flex items-center" role="list" aria-label={t("table.order")}>
        {ORDER_STAGES.flatMap((stageItem, index) => {
          const Icon = STAGE_ICON[stageItem];
          const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "todo";
          const stateLabel =
            state === "done"
              ? t("table.stepDone")
              : state === "current"
                ? t("table.stepCurrent")
                : t("table.stepUpcoming");

          // Keying by state (not just stageItem) remounts this node exactly
          // when it actually transitions (todo -> current -> done), which is
          // what replays animate-attention-pop - not on every unrelated
          // re-render. A guest watching this update live (kitchen accepts,
          // starts cooking, waiter picks it up) sees each step announce
          // itself instead of silently changing color.
          const node = (
            <div
              key={`${stageItem}-${state}`}
              role="listitem"
              aria-current={state === "current" ? "step" : undefined}
              aria-label={`${t(STAGE_LABEL_KEY[stageItem])} — ${stateLabel}`}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                state === "done"
                  ? "animate-attention-pop bg-sage-600 text-on-accent"
                  : state === "current"
                    ? "animate-attention-pop bg-accent-500 text-on-accent"
                    : "bg-ink-100 text-ink-400"
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>
          );

          if (index === ORDER_STAGES.length - 1) return [node];
          const line = (
            <div
              key={`${stageItem}-line`}
              aria-hidden="true"
              className={`h-0.5 flex-1 transition-colors ${
                index < currentIndex ? "bg-sage-600" : "bg-ink-100"
              }`}
            />
          );
          return [node, line];
        })}
      </div>

      <p className="mt-3 text-sm text-ink-600" aria-live="polite">
        {t(STAGE_CAPTION_KEY[stage])}
      </p>

      {newItemsCount > 0 && (
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-700">
          +{newItemsCount} {t("table.newItemsSuffix")}
        </span>
      )}
    </div>
  );
}
