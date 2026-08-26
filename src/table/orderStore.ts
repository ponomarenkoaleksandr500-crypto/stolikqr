import type { CartItem } from "@/cart/types";
import type { KitchenStatus, Order, OrderItem } from "@/types/table";
import {
  createOrder,
  fetchOrdersForGuestSession,
  reorderLastOrder,
  type OrderItemResponse,
  type OrderResponse,
  type ReorderSkippedItem,
} from "@/lib/api";

type Listener = () => void;

let currentOrder: Order | null = null;
// Raw last backend Order (unmerged), just for the "Order again" card - the
// merged `currentOrder` view above collapses every round into one and loses
// which items belonged to the most recent one.
let lastRawOrder: OrderResponse | null = null;
const EMPTY_SKIPPED: ReorderSkippedItem[] = [];
let reorderNotice: ReorderSkippedItem[] = EMPTY_SKIPPED;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getSnapshot(): Order | null {
  return currentOrder;
}

export function getServerSnapshot(): Order | null {
  return null;
}

export function getLastOrderSnapshot(): OrderResponse | null {
  return lastRawOrder;
}

export function getLastOrderServerSnapshot(): OrderResponse | null {
  return null;
}

export function getReorderNoticeSnapshot(): ReorderSkippedItem[] {
  return reorderNotice;
}

export function getReorderNoticeServerSnapshot(): ReorderSkippedItem[] {
  return EMPTY_SKIPPED;
}

/** Dismisses the "some items couldn't be restored" banner after the guest has seen it. */
export function dismissReorderNotice(): void {
  if (reorderNotice.length === 0) return;
  reorderNotice = EMPTY_SKIPPED;
  notify();
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Maps the backend's 5-value OrderStatus (NEW/ACCEPTED/PREPARING/READY/SERVED,
 * driven by a real Waiter App) onto the client's 4-stage KitchenStatus, 1:1
 * except NEW/ACCEPTED both collapse to "accepted" (kitchen hasn't started
 * cooking either way, no guest-visible difference between them).
 */
function mapBackendStatus(status: string): KitchenStatus {
  if (status === "PREPARING") return "preparing";
  if (status === "READY") return "ready";
  if (status === "SERVED") return "served";
  return "accepted"; // NEW or ACCEPTED - kitchen hasn't started yet
}

function toClientOrderItem(apiItem: OrderItemResponse, batchIndex: number): OrderItem {
  const selections: Record<string, string[]> = {};
  for (const modifier of apiItem.modifiers) {
    (selections[modifier.groupId] ??= []).push(modifier.choiceId);
  }
  const unitPrice =
    apiItem.basePrice + apiItem.modifiers.reduce((sum, m) => sum + m.priceDelta, 0);

  return {
    id: apiItem.id,
    dishId: apiItem.dishId,
    dishSlug: apiItem.dishSlug,
    dishName: apiItem.name,
    emoji: apiItem.emoji,
    gradient: apiItem.gradient,
    unitPrice,
    selections,
    selectionsSummary: apiItem.selectionsSummary,
    excludedIngredientIds: apiItem.excludedIngredients.map((i) => i.id),
    excludedIngredientsSummary: apiItem.excludedSummary,
    optionsKey: apiItem.id,
    quantity: apiItem.quantity,
    status: mapBackendStatus(apiItem.status),
    batchIndex,
  };
}

/**
 * The table's current round: everything strictly after the last time the
 * whole tab was settled. `findForGuestSession` returns the table's *entire*
 * history (see OrdersService.findForGuestSession), so once an earlier round
 * has been paid off, those orders are done and must never resurface just
 * because the table opened a new, unrelated round later - only the tail
 * after the last paid order is "this round" (see mergeOrders below).
 */
function currentRoundOrders(apiOrders: OrderResponse[]): OrderResponse[] {
  const lastPaidIndex = apiOrders.reduce(
    (lastIndex, order, index) => (order.paidAt !== null ? index : lastIndex),
    -1,
  );
  // Every order is paid (or there are none) - keep the lot so the "paid"
  // summary below still has the full, settled round to total up.
  if (lastPaidIndex === apiOrders.length - 1) return apiOrders;
  return apiOrders.slice(lastPaidIndex + 1);
}

/** One backend Order = one submission round/batch (see OrdersService.findForGuestSession). */
function mergeOrders(apiOrders: OrderResponse[], sessionId: string): Order | null {
  const roundOrders = currentRoundOrders(apiOrders);
  const first = roundOrders[0];
  if (!first) return null;

  const items = roundOrders.flatMap((apiOrder, batchIndex) =>
    apiOrder.items.map((apiItem) => toClientOrderItem(apiItem, batchIndex)),
  );

  // The merged view is only "paid" once every order in it is - a guest who
  // pays and then orders more starts a fresh, unsettled round (see
  // orderStatus.ts's isOrderSettled/getPrimaryStatus, unchanged since D1).
  const allPaid = roundOrders.every((order) => order.paidAt !== null);
  const paidAt = allPaid ? Math.max(...roundOrders.map((order) => order.paidAt ?? 0)) : null;

  return {
    id: first.id,
    tableId: first.tableId,
    sessionId,
    items,
    createdAt: first.createdAt,
    paidAt,
  };
}

/**
 * Fetches the table's real orders from the backend. Called on session
 * bootstrap/reload and again every time the table's realtime socket reports
 * an order change (see lib/guestSocket.ts) - a WS event is treated as "go
 * refetch" rather than carrying the new state itself, which keeps this the
 * single source of truth and avoids partial-merge bugs.
 */
export async function loadOrderForSession(sessionId: string): Promise<void> {
  try {
    const apiOrders = await fetchOrdersForGuestSession(sessionId);
    currentOrder = mergeOrders(apiOrders, sessionId);
    lastRawOrder = apiOrders[apiOrders.length - 1] ?? null;
    notify();
  } catch (error) {
    console.error("Failed to load orders for guest session", error);
  }
}

/**
 * Submits the current cart as one real backend Order, then reloads from the
 * backend so the merged view reflects the authoritative state. Returns
 * whether it succeeded, so the caller (cart UI) only clears the cart on
 * success rather than losing it on a failed request.
 */
export async function submitCartItems(cartItems: CartItem[], sessionId: string): Promise<boolean> {
  if (cartItems.length === 0) return false;
  try {
    await createOrder(
      sessionId,
      cartItems.map((item) => ({
        dishId: item.dishId,
        quantity: item.quantity,
        modifierChoiceIds: Object.values(item.selections).flat(),
        excludedIngredientIds: item.excludedIngredientIds,
      })),
    );
    await loadOrderForSession(sessionId);
    return true;
  } catch (error) {
    console.error("Failed to submit order", error);
    return false;
  }
}

/**
 * D8 "Order again": repeats the table's last order. The server derives the
 * items itself from that order and re-validates/re-prices everything against
 * the live menu - this only ever sends a guestSessionId, nothing else. Any
 * items the server couldn't restore are surfaced via reorderNotice.
 * Returns whether a new order actually got created.
 */
export async function reorderLast(sessionId: string): Promise<boolean> {
  try {
    const result = await reorderLastOrder(sessionId);
    reorderNotice = result.skippedItems;
    await loadOrderForSession(sessionId);
    return result.order !== null;
  } catch (error) {
    console.error("Failed to reorder", error);
    return false;
  }
}

/** Clears the local order view, e.g. when a guest session ends or the table changes. */
export function clearOrder(): void {
  currentOrder = null;
  lastRawOrder = null;
  reorderNotice = EMPTY_SKIPPED;
  notify();
}
