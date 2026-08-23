import type { GuestSession } from "@/types/table";
import * as cartStore from "@/cart/cartStore";
import * as orderStore from "./orderStore";
import * as waiterStore from "./waiterStore";

const STORAGE_KEY = "stolikqr.session";

type Listener = () => void;

let currentSession: GuestSession | null = null;
let hydrated = false;
const listeners = new Set<Listener>();

function isGuestSession(value: unknown): value is GuestSession {
  if (typeof value !== "object" || value === null) return false;
  const session = value as Record<string, unknown>;
  return (
    typeof session.id === "string" &&
    typeof session.restaurantSlug === "string" &&
    typeof session.tableCode === "string" &&
    typeof session.startedAt === "number"
  );
}

/** Re-reads localStorage and syncs in-memory state - used both at first load and on cross-tab storage events. */
function syncFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      currentSession = null;
      return;
    }
    const parsed: unknown = JSON.parse(raw);
    currentSession = isGuestSession(parsed) ? parsed : null;
  } catch {
    currentSession = null;
  }
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  syncFromStorage();
}

/**
 * Cross-tab sync: the native `storage` event fires only in *other* tabs of
 * the same browser, never the one that wrote the change. If a table switch
 * happened in another tab, this tab's cart/order/waiter call are stale for
 * whatever table it *thinks* it's still on, so they're cleared the same way
 * `startSession` clears them locally on a same-tab switch.
 */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    const previous = currentSession;
    syncFromStorage();
    if (isDifferentTable(previous, currentSession)) {
      clearOtherTableState();
    }
    notify();
  });
}

function persist() {
  try {
    if (currentSession) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSession));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage may be unavailable - ignore.
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function getSnapshot(): GuestSession | null {
  ensureHydrated();
  return currentSession;
}

export function getServerSnapshot(): GuestSession | null {
  return null;
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isDifferentTable(a: GuestSession | null, b: GuestSession | null): boolean {
  if (!a || !b) return false; // nothing to leak from "no session" either direction
  return a.restaurantSlug !== b.restaurantSlug || a.tableCode !== b.tableCode;
}

/**
 * A table's cart/order/waiter-call state must never bleed into a different
 * table (or a different restaurant) - see the "Guest A / Guest B" backend
 * audit finding. Since each of these is a single global mock store rather
 * than namespaced per table, the isolation is enforced here, at the one
 * place that already knows a table switch just happened.
 */
function clearOtherTableState(): void {
  cartStore.clearCart();
  orderStore.clearOrder();
  waiterStore.clearCall();
}

/**
 * Starts (or resumes) a table session. A phone is physically at one table at
 * a time, so scanning a different table's QR simply overwrites the session.
 * Re-scanning the same table is a no-op so its startedAt isn't reset.
 */
export function startSession(restaurantSlug: string, tableCode: string): void {
  ensureHydrated();
  if (
    currentSession &&
    currentSession.restaurantSlug === restaurantSlug &&
    currentSession.tableCode === tableCode
  ) {
    return;
  }
  const previous = currentSession;
  currentSession = {
    id: crypto.randomUUID(),
    restaurantSlug,
    tableCode,
    startedAt: Date.now(),
  };
  persist();
  notify();
  if (isDifferentTable(previous, currentSession)) {
    clearOtherTableState();
  }
}

export function endSession(): void {
  currentSession = null;
  persist();
  notify();
}
