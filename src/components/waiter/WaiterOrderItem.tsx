"use client";

import { formatPrice } from "@/lib/format";
import type { OrderItemResponse } from "@/lib/api";

/**
 * One order line as staff need to read it: what was ordered, which
 * modifiers the guest picked, and - most importantly - which ingredients
 * they asked to leave out.
 *
 * Both screens used to render only "quantity × name" and a price, so a
 * guest's "без цибулі" never reached the person carrying the plate. The
 * backend has always sent these fields (OrdersService.toOrderDto builds
 * selectionsSummary/excludedSummary snapshots for every consumer); only
 * the Waiter App failed to show them.
 *
 * Excluded ingredients are deliberately the loudest thing on the line:
 * getting a modifier wrong is an annoyance, missing an exclusion can be
 * an allergy. The Waiter App is Ukrainian-only, hence the `.uk` reads -
 * same convention as the rest of these screens.
 */
export function WaiterOrderItem({
  item,
  tone = "default",
}: {
  item: OrderItemResponse;
  /** "muted" is for the floor list, where lines sit inside a denser card. */
  tone?: "default" | "muted";
}) {
  const modifiers = item.selectionsSummary?.uk?.trim();
  const excluded = item.excludedSummary?.uk?.trim();

  return (
    <li className="py-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <span className={tone === "muted" ? "text-ink-600" : "text-ink-700"}>
          {item.quantity} × {item.name.uk}
        </span>
        <span
          className={`shrink-0 tabular-nums ${tone === "muted" ? "text-ink-500" : "text-ink-600"}`}
        >
          {formatPrice(item.lineTotal)}
        </span>
      </div>

      {(modifiers || excluded) && (
        <div className="mt-1 flex flex-col gap-1">
          {modifiers && <p className="text-xs leading-relaxed text-ink-500">{modifiers}</p>}
          {excluded && (
            <p className="inline-flex w-fit items-center rounded-sm bg-danger-50 px-2 py-0.5 text-xs font-semibold leading-relaxed text-danger-600">
              {excluded}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
