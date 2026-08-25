import type { CartItem } from "@/cart/types";
import type { KitchenStatus, Order, OrderItem } from "@/types/table";
import { createOrder, fetchOrdersForGuestSession, type OrderItemResponse, type OrderResponse } from "@/lib/api";

type Listener = () => void;

let currentOrder: Order | null = null;
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

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Maps the backend's 5-value OrderStatus (NEW/ACCEPTED/PREPARING/READY/SERVED,
 * now genuinely driven by a real Waiter App) onto the client's existing
 * 3-stage KitchenStatus - the OrderStatusCard/OrderLineItem stepper UI is
 * unchanged, only real status replaces what used to be a client-only mock
 * timer (pre-D5, when nothing could actually move an order forward).
 */
function mapBackendStatus(status: string): KitchenStatus {
  if (status === "PREPARING") return "preparing";
  if (status === "READY" || status === "SERVED") return "ready";
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
    sentAt: apiItem.createdAt,
    stageSince: apiItem.createdAt,
  };
}

/** One backend Order = one submission round/batch (see OrdersService.findForGuestSession). */
function mergeOrders(apiOrders: OrderResponse[], sessionId: string): Order | null {
  const first = apiOrders[0];
  if (!first) return null;

  const items = apiOrders.flatMap((apiOrder, batchIndex) =>
    apiOrder.items.map((apiItem) => toClientOrderItem(apiItem, batchIndex)),
  );

  // The merged view is only "paid" once every order in it is - a guest who
  // pays and then orders more starts a fresh, unsettled round (see
  // orderStatus.ts's isOrderSettled/getPrimaryStatus, unchanged since D1).
  const allPaid = apiOrders.every((order) => order.paidAt !== null);
  const paidAt = allPaid ? Math.max(...apiOrders.map((order) => order.paidAt ?? 0)) : null;

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

/** Clears the local order view, e.g. when a guest session ends or the table changes. */
export function clearOrder(): void {
  currentOrder = null;
  notify();
}
