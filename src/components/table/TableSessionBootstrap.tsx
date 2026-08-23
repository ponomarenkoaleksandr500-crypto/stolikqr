"use client";

import { useEffect } from "react";
import { useTableSession } from "@/table/TableSessionProvider";

/** Establishes (or resumes) the guest session when landing via a table's QR link. */
export function TableSessionBootstrap({
  restaurantSlug,
  tableCode,
}: {
  restaurantSlug: string;
  tableCode: string;
}) {
  const { startSession } = useTableSession();

  // Deliberately keyed only on this tab's own route params, not on `session`
  // (which also changes when another tab's cross-tab sync writes a session
  // for a different table - reacting to that here would fight the other tab
  // over which table "wins", looping forever). startSession() is itself an
  // idempotent no-op when the session already matches.
  useEffect(() => {
    startSession(restaurantSlug, tableCode);
  }, [restaurantSlug, tableCode, startSession]);

  return null;
}
