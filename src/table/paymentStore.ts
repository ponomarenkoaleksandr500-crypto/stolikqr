import { createPayment, fetchLatestPayment, type PaymentMethod, type PaymentResponse } from "@/lib/api";
import * as orderStore from "./orderStore";

export type PaymentState = PaymentResponse;

type Listener = () => void;

let current: PaymentState | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getSnapshot(): PaymentState | null {
  return current;
}

export function getServerSnapshot(): PaymentState | null {
  return null;
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Loads the table's latest payment from the backend, e.g. on session
 * bootstrap/reload and again whenever the table's realtime socket reports a
 * payment change (see lib/guestSocket.ts). Also refreshes the order view -
 * a SUCCEEDED payment marks every then-unpaid order's `paidAt`, which is
 * what orderStatus.ts's isOrderSettled/getPrimaryStatus actually read.
 */
export async function loadLatestPayment(sessionId: string): Promise<void> {
  try {
    current = await fetchLatestPayment(sessionId);
    notify();
    void orderStore.loadOrderForSession(sessionId);
  } catch (error) {
    console.error("Failed to load latest payment", error);
  }
}

/** Requests payment for the table's whole open tab. Settlement arrives asynchronously over the socket. */
export async function requestPayment(sessionId: string): Promise<boolean> {
  try {
    current = await createPayment(sessionId);
    notify();
    return true;
  } catch (error) {
    console.error("Failed to request payment", error);
    return false;
  }
}

/**
 * Guest self-checkout from the Cart: unlike requestPayment() above, the
 * response here already comes back SUCCEEDED (see backend PaymentsService's
 * instant-settle path for a chosen method) - no need to wait for a socket
 * push, so this also refreshes the order view itself rather than leaving
 * that to loadLatestPayment's usual socket-triggered call.
 */
export async function payWithMethod(sessionId: string, method: PaymentMethod): Promise<boolean> {
  try {
    current = await createPayment(sessionId, method);
    notify();
    void orderStore.loadOrderForSession(sessionId);
    return true;
  } catch (error) {
    console.error("Failed to pay", error);
    return false;
  }
}

export function isPending(state: PaymentState | null): boolean {
  return state !== null && state.status === "PENDING";
}

export function isSucceeded(state: PaymentState | null): boolean {
  return state !== null && state.status === "SUCCEEDED";
}

/** No real money moved. The UI must say so rather than show a settlement
 *  indistinguishable from a real one (DEC-006). */
export function isDemo(state: PaymentState | null): boolean {
  return state !== null && state.mode === "DEMO";
}

/** Clears the locally cached payment, e.g. when the active table changes (see table/tableStore.ts). */
export function clearPayment(): void {
  current = null;
  notify();
}
