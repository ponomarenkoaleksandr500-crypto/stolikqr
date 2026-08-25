"use client";

import { useEffect } from "react";
import { useTableSession } from "@/table/TableSessionProvider";
import { useAnalytics } from "@/lib/analytics";

/** Establishes (or resumes) the guest session when landing via a table's QR link. */
export function TableSessionBootstrap({
  restaurantSlug,
  tableCode,
  qrToken,
}: {
  restaurantSlug: string;
  tableCode: string;
  qrToken: string;
}) {
  const { startSession } = useTableSession();
  const { track } = useAnalytics();

  // Deliberately keyed only on this tab's own route params, not on `session`
  // (which also changes when another tab's cross-tab sync writes a session
  // for a different table - reacting to that here would fight the other tab
  // over which table "wins", looping forever). startSession() always confirms
  // with the backend (POST /guest-sessions) - see tableStore.ts - so a reload
  // resumes the same server-side session rather than just trusting local state.
  useEffect(() => {
    track("QR_SCANNED");
    startSession(restaurantSlug, tableCode, qrToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- track is recreated per render, only route params should re-trigger this
  }, [restaurantSlug, tableCode, qrToken, startSession]);

  return null;
}
