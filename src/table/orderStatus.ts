import type { KitchenStatus, Order, OrderItem, OrderStageStatus } from "@/types/table";

const KITCHEN_STAGE_ORDER: KitchenStatus[] = ["accepted", "preparing", "ready", "served"];

export const ORDER_STAGES: OrderStageStatus[] = [
  "accepted",
  "preparing",
  "ready",
  "served",
  "paid",
];

export function stageProgressIndex(stage: OrderStageStatus): number {
  return ORDER_STAGES.indexOf(stage);
}

function kitchenStageIndex(status: KitchenStatus): number {
  return KITCHEN_STAGE_ORDER.indexOf(status);
}

/** The least-progressed status among a set of items - "the kitchen still owes you this much." */
function leastProgressed(items: OrderItem[]): KitchenStatus | null {
  if (items.length === 0) return null;
  return items.reduce<KitchenStatus>(
    (min, item) => (kitchenStageIndex(item.status) < kitchenStageIndex(min) ? item.status : min),
    items[0].status,
  );
}

/** Every item has reached "served" - the kitchen owes the table nothing more. */
export function isKitchenComplete(order: Order | null): boolean {
  if (!order || order.items.length === 0) return false;
  return order.items.every((item) => item.status === "served");
}

/**
 * The order's headline status. Tracks the *first* submitted batch only, so
 * that a guest ordering more food after their meal is already ready doesn't
 * see the whole order regress back to "preparing" - see getNewItemsCount.
 *
 * Payment is NOT a shortcut to the end of this list. A guest who pays up
 * front (the cart's self-checkout settles instantly) has not received their
 * food yet, and used to be shown "paid" with every kitchen step marked done
 * the moment the payment went through. "paid" is now only the headline once
 * the kitchen has actually served everything; until then the real cooking
 * stage is reported and the payment shows as a separate fact
 * (see OrderStatusCard).
 */
export function getPrimaryStatus(order: Order): OrderStageStatus {
  if (order.paidAt && isKitchenComplete(order)) return "paid";
  const primaryBatch = order.items.filter((item) => item.batchIndex === 0);
  return leastProgressed(primaryBatch) ?? leastProgressed(order.items) ?? "accepted";
}

/** Items from a later "add more" round that haven't caught up to ready (or served) yet. */
export function getNewItemsCount(order: Order): number {
  // Paying does not deliver food, so a paid order can still owe the guest
  // items from a later round - do not zero this out on payment.
  return order.items.filter(
    (item) => item.batchIndex > 0 && kitchenStageIndex(item.status) < kitchenStageIndex("ready"),
  ).length;
}

export function getOrderTotals(order: Order): { count: number; total: number } {
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const total = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return { count, total };
}

export function isOrderEmpty(order: Order | null): boolean {
  return !order || order.items.length === 0;
}

/**
 * There is an order to show the guest. That is all it means now.
 *
 * Every conditional version of this has been wrong in one direction or
 * the other, and each one shipped before being caught:
 *
 * - `!order.paidAt` hid the status from a guest who paid up front while
 *   the kitchen had not started.
 * - `!isKitchenComplete(order)` hid it from a guest whose food was served
 *   but who had not paid, taking the pay button away with it.
 *
 * The guest is never shown out of their own table, so an order stays
 * visible for as long as it exists. Whether the round is finished is a
 * separate question - see isOrderSettled, which only decides whether to
 * offer another round.
 */
export function isOrderActive(order: Order | null): boolean {
  return !isOrderEmpty(order);
}

/**
 * This round is finished: paid, everything served, and nothing new pending
 * in the cart.
 *
 * This no longer hides anything from the guest - there is no thank-you
 * screen any more. It only decides whether it makes sense to offer
 * "order again", since a fresh, unsubmitted cart already means the guest
 * has started the next round themselves (see orderStore.ts:
 * submitCartItems opens a new Order once the previous one is paid).
 */
export function isOrderSettled(order: Order | null, pendingCartCount: number): boolean {
  return Boolean(order?.paidAt) && isKitchenComplete(order) && pendingCartCount === 0;
}
