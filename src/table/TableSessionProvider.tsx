"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import * as tableStore from "./tableStore";
import type { GuestSession, Table } from "@/types/table";

/**
 * Mock table resolver. No registry exists yet - this just constructs a Table
 * from the URL. A future API call (`GET /restaurants/:slug/tables/:code`)
 * can replace the body without changing the signature or any caller.
 */
export function resolveTable(restaurantSlug: string, tableCode: string): Table {
  return { id: `${restaurantSlug}-${tableCode}`, restaurantSlug, code: tableCode };
}

interface TableSessionContextValue {
  session: GuestSession | null;
  table: Table | null;
  isTableMode: boolean;
  /** Resolves once the backend has confirmed the session, so callers can act on it (see TableSessionBootstrap). */
  startSession: (restaurantSlug: string, tableCode: string, qrToken: string) => Promise<void>;
  endSession: () => void;
}

const TableSessionContext = createContext<TableSessionContextValue | null>(null);

export function TableSessionProvider({ children }: { children: React.ReactNode }) {
  const session = useSyncExternalStore(
    tableStore.subscribe,
    tableStore.getSnapshot,
    tableStore.getServerSnapshot,
  );

  const value = useMemo<TableSessionContextValue>(() => {
    const table = session ? resolveTable(session.restaurantSlug, session.tableCode) : null;
    return {
      session,
      table,
      isTableMode: session !== null,
      startSession: tableStore.startSession,
      endSession: tableStore.endSession,
    };
  }, [session]);

  return <TableSessionContext.Provider value={value}>{children}</TableSessionContext.Provider>;
}

export function useTableSession() {
  const ctx = useContext(TableSessionContext);
  if (!ctx) {
    throw new Error("useTableSession must be used within a TableSessionProvider");
  }
  return ctx;
}
