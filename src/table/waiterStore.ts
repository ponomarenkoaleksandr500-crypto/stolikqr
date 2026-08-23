const STORAGE_KEY = "stolikqr.waiterCall";

/** How long after a call before the guest can call again, to prevent accidental repeats. */
export const WAITER_COOLDOWN_MS = 60_000;

/**
 * A call is unambiguously tied to the table (via `tableId`) and the guest
 * device that made it (`sessionId`), plus the reason and time - matching the
 * shape a future `POST /tables/:id/waiter-calls` endpoint would need.
 */
export interface WaiterCallState {
  reasonKey: string;
  calledAt: number;
  tableId: string;
  sessionId: string;
}

type Listener = () => void;

let current: WaiterCallState | null = null;
let hydrated = false;
const listeners = new Set<Listener>();

function isWaiterCallState(value: unknown): value is WaiterCallState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Record<string, unknown>;
  return (
    typeof state.reasonKey === "string" &&
    typeof state.calledAt === "number" &&
    typeof state.tableId === "string" &&
    typeof state.sessionId === "string"
  );
}

/** Re-reads localStorage and syncs in-memory state - used both at first load and on cross-tab storage events. */
function syncFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      current = null;
      return;
    }
    const parsed: unknown = JSON.parse(raw);
    current = isWaiterCallState(parsed) ? parsed : null;
  } catch {
    current = null;
  }
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  syncFromStorage();
}

/** Cross-tab sync: the native `storage` event fires only in *other* tabs, never the one that wrote the change. */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    syncFromStorage();
    notify();
  });
}

function persist() {
  try {
    if (current) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
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

export function getSnapshot(): WaiterCallState | null {
  ensureHydrated();
  return current;
}

export function getServerSnapshot(): WaiterCallState | null {
  return null;
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function callWaiter(reasonKey: string, tableId: string, sessionId: string): void {
  current = { reasonKey, calledAt: Date.now(), tableId, sessionId };
  persist();
  notify();
}

/** Clears the call, e.g. when the active table changes (see table/tableStore.ts). */
export function clearCall(): void {
  current = null;
  persist();
  notify();
}

export function isOnCooldown(state: WaiterCallState | null): boolean {
  if (!state) return false;
  return Date.now() - state.calledAt < WAITER_COOLDOWN_MS;
}

export function cooldownRemainingMs(state: WaiterCallState | null): number {
  if (!state) return 0;
  return Math.max(0, WAITER_COOLDOWN_MS - (Date.now() - state.calledAt));
}
