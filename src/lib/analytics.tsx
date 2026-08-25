"use client";

import { createContext, useContext, useMemo } from "react";
import { trackEvent, type ClientTrackableEventName } from "./api";
import { useTableSession } from "@/table/TableSessionProvider";

const AnalyticsContext = createContext<string | null>(null);

/** Wraps the guest-facing tree once the restaurant is known (see RestaurantShell). */
export function AnalyticsProvider({
  restaurantId,
  children,
}: {
  restaurantId: string;
  children: React.ReactNode;
}) {
  return (
    <AnalyticsContext.Provider value={restaurantId}>{children}</AnalyticsContext.Provider>
  );
}

/**
 * guestSessionId is read live from TableSessionProvider on every call, not
 * baked into the context - plain menu browsing (no table scanned yet) still
 * reports events, just without it. There's no tableId here on purpose:
 * TableSessionProvider's `table.id` is a synthetic client-side value (see
 * resolveTable()), not the real backend Table.id - the backend derives the
 * real one itself from guestSessionId (see AnalyticsService.track).
 */
export function useAnalytics() {
  const restaurantId = useContext(AnalyticsContext);
  const { session } = useTableSession();

  return useMemo(
    () => ({
      track: (
        name: ClientTrackableEventName,
        extra?: { dishId?: string; payload?: Record<string, unknown> },
      ) => {
        if (!restaurantId) return;
        trackEvent({
          name,
          restaurantId,
          guestSessionId: session?.id,
          dishId: extra?.dishId,
          payload: extra?.payload,
        });
      },
    }),
    [restaurantId, session],
  );
}
