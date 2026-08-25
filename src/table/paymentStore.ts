import { createPayment, fetchLatestPayment, type PaymentResponse } from "@/lib/api";
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

export function isPending(state: PaymentState | null): boolean {
  return state !== null && state.status === "PENDING";
}

export function isSucceeded(state: PaymentState | null): boolean {
  return state !== null && state.status === "SUCCEEDED";
}

/** Clears the locally cached payment, e.g. when the active table changes (see table/tableStore.ts). */
export function clearPayment(): void {
  current = null;
  notify();
}
