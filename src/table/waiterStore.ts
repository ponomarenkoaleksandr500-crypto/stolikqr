import { createWaiterCall, fetchActiveWaiterCall, type WaiterCallResponse } from "@/lib/api";

export type WaiterCallState = WaiterCallResponse;

type Listener = () => void;

let current: WaiterCallState | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getSnapshot(): WaiterCallState | null {
  return current;
}

export function getServerSnapshot(): WaiterCallState | null {
  return null;
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Loads the table's real active call from the backend, e.g. on session bootstrap/reload. */
export async function loadActiveCall(guestSessionId: string): Promise<void> {
  try {
    current = await fetchActiveWaiterCall(guestSessionId);
    notify();
  } catch (error) {
    console.error("Failed to load active waiter call", error);
  }
}

/**
 * Calls the waiter. The backend itself is idempotent (one active call per
 * table), but the Guest App UI never even shows the reason picker while
 * `isActive(getSnapshot())` is true - see WaiterFab.tsx - so this is normally
 * only ever invoked when there truly is no active call yet.
 */
export async function callWaiter(
  guestSessionId: string,
  reasonKey: string,
): Promise<WaiterCallState | null> {
  try {
    current = await createWaiterCall(guestSessionId, reasonKey);
    notify();
    return current;
  } catch (error) {
    console.error("Failed to call waiter", error);
    return null;
  }
}

/** Clears the locally cached call, e.g. when the active table changes (see table/tableStore.ts). */
export function clearCall(): void {
  current = null;
  notify();
}

export function isActive(state: WaiterCallState | null): boolean {
  return state !== null && state.status !== "COMPLETED";
}
