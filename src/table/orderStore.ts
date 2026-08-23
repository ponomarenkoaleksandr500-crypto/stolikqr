import type { CartItem } from "@/cart/types";
import type { KitchenStatus, Order, OrderItem } from "@/types/table";

const STORAGE_KEY = "stolikqr.order";

type Listener = () => void;

let currentOrder: Order | null = null;
let hydrated = false;
const listeners = new Set<Listener>();

function isOrder(value: unknown): value is Order {
  if (typeof value !== "object" || value === null) return false;
  const order = value as Record<string, unknown>;
  return (
    typeof order.id === "string" &&
    typeof order.tableId === "string" &&
    typeof order.sessionId === "string" &&
    Array.isArray(order.items) &&
    typeof order.createdAt === "number"
  );
}

/** Re-reads localStorage and syncs in-memory state - used both at first load and on cross-tab storage events. */
function syncFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      currentOrder = null;
      return;
    }
    const parsed: unknown = JSON.parse(raw);
    currentOrder = isOrder(parsed) ? parsed : null;
  } catch {
    currentOrder = null;
  }
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  syncFromStorage();
  if (currentOrder) resumeProgression();
}

/**
 * Cross-tab sync: the native `storage` event fires only in *other* tabs of
 * the same browser, never the tab that made the change, so this can never
 * loop back on itself. Deliberately doesn't re-arm kitchen-progression
 * timers on every event (see resumeProgression) - only the data is synced,
 * not the mock simulation itself.
 */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    syncFromStorage();
    notify();
  });
}

function persist() {
  try {
    if (currentOrder) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentOrder));
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

export function getSnapshot(): Order | null {
  ensureHydrated();
  return currentOrder;
}

export function getServerSnapshot(): Order | null {
  return null;
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * MOCK kitchen simulation - there is no backend yet. Each item advances
 * accepted -> preparing -> ready on a timer. Everything downstream only
 * reads `item.status`, so swapping this for real kitchen status pushes
 * (polling/SSE) later needs no changes outside this file.
 */
const KITCHEN_PROGRESSION_MS: Record<KitchenStatus, number> = {
  accepted: 6000,
  preparing: 14000,
  ready: 0,
};

function nextKitchenStatus(status: KitchenStatus): KitchenStatus | null {
  if (status === "accepted") return "preparing";
  if (status === "preparing") return "ready";
  return null;
}

function scheduleKitchenProgression(itemId: string, from: KitchenStatus, delayOverrideMs?: number) {
  if (typeof window === "undefined") return;
  const next = nextKitchenStatus(from);
  if (!next) return;
  const delay = delayOverrideMs ?? KITCHEN_PROGRESSION_MS[from];
  window.setTimeout(() => advanceItemStatus(itemId, from), Math.max(0, delay));
}

function advanceItemStatus(itemId: string, from: KitchenStatus) {
  if (!currentOrder) return;
  const item = currentOrder.items.find((candidate) => candidate.id === itemId);
  if (!item || item.status !== from) return; // stale timer (e.g. after a reload) - ignore
  const next = nextKitchenStatus(from);
  if (!next) return;
  const now = Date.now();
  currentOrder = {
    ...currentOrder,
    items: currentOrder.items.map((candidate) =>
      candidate.id === itemId ? { ...candidate, status: next, stageSince: now } : candidate,
    ),
  };
  persist();
  notify();
  scheduleKitchenProgression(itemId, next);
}

/** Resumes timers for any in-progress items after a page reload, honoring elapsed time. */
function resumeProgression() {
  if (!currentOrder) return;
  const now = Date.now();
  for (const item of currentOrder.items) {
    if (item.status === "ready") continue;
    const elapsed = now - item.stageSince;
    const remaining = KITCHEN_PROGRESSION_MS[item.status] - elapsed;
    scheduleKitchenProgression(item.id, item.status, remaining);
  }
}

/**
 * MOCK payment simulation, deliberately triggered by the guest's "bring the
 * bill" waiter call rather than a bare timer, so it stays tied to something
 * the guest actually did. Replace with a real POS/payment webhook later.
 */
const MOCK_PAYMENT_DELAY_MS = 8000;

export function scheduleMockPayment(): void {
  if (typeof window === "undefined" || !currentOrder || currentOrder.paidAt) return;
  const orderId = currentOrder.id;
  window.setTimeout(() => {
    if (!currentOrder || currentOrder.id !== orderId || currentOrder.paidAt) return;
    currentOrder = { ...currentOrder, paidAt: Date.now() };
    persist();
    notify();
  }, MOCK_PAYMENT_DELAY_MS);
}

/**
 * Assigns the next submission round's batch index.
 *
 * Source of truth: this store, for the mock. Safe here only because a single
 * JS tab is the sole writer - there is no concurrent access to race against.
 * Do NOT port this "max + 1" scan as-is to a server: under concurrent writes
 * (two guests at the same table submitting at once) it needs either an
 * atomic counter (DB sequence/transaction) or should be dropped entirely in
 * favor of ordering batches by `createdAt`. Isolated here as its own
 * function specifically so that swap is a one-function change.
 */
function nextBatchIndex(openOrder: Order | null): number {
  if (!openOrder) return 0;
  return openOrder.items.reduce((max, item) => Math.max(max, item.batchIndex), -1) + 1;
}

/** Sends the current cart's items to the kitchen, appending to any existing order for this table visit. */
export function submitCartItems(cartItems: CartItem[], tableId: string, sessionId: string): void {
  if (cartItems.length === 0) return;
  ensureHydrated();
  // A paid order is closed - a further submission starts a fresh visit-order
  // rather than reopening the settled bill.
  const openOrder = currentOrder && !currentOrder.paidAt ? currentOrder : null;

  const now = Date.now();
  const batchIndex = nextBatchIndex(openOrder);

  const newItems: OrderItem[] = cartItems.map((item) => ({
    ...item,
    status: "accepted",
    batchIndex,
    sentAt: now,
    stageSince: now,
  }));

  currentOrder = openOrder
    ? { ...openOrder, items: [...openOrder.items, ...newItems] }
    : { id: crypto.randomUUID(), tableId, sessionId, items: newItems, createdAt: now, paidAt: null };

  persist();
  notify();
  newItems.forEach((item) => scheduleKitchenProgression(item.id, "accepted"));
}

/** Clears the order, e.g. when a guest session ends. */
export function clearOrder(): void {
  currentOrder = null;
  persist();
  notify();
}
