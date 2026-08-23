import type { KitchenStatus, Order, OrderItem, OrderStageStatus } from "@/types/table";

const KITCHEN_STAGE_ORDER: KitchenStatus[] = ["accepted", "preparing", "ready"];

export const ORDER_STAGES: OrderStageStatus[] = ["accepted", "preparing", "ready", "paid"];

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

/**
 * The order's headline status. Tracks the *first* submitted batch only, so
 * that a guest ordering more food after their meal is already ready doesn't
 * see the whole order regress back to "preparing" - see getNewItemsCount.
 */
export function getPrimaryStatus(order: Order): OrderStageStatus {
  if (order.paidAt) return "paid";
  const primaryBatch = order.items.filter((item) => item.batchIndex === 0);
  return leastProgressed(primaryBatch) ?? leastProgressed(order.items) ?? "accepted";
}

/** Items from a later "add more" round that haven't caught up to ready yet. */
export function getNewItemsCount(order: Order): number {
  if (order.paidAt) return 0;
  return order.items.filter((item) => item.batchIndex > 0 && item.status !== "ready").length;
}

export function getOrderTotals(order: Order): { count: number; total: number } {
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const total = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return { count, total };
}

export function isOrderEmpty(order: Order | null): boolean {
  return !order || order.items.length === 0;
}

/** There's an order with items that isn't paid yet - i.e. something to actively track. */
export function isOrderActive(order: Order | null): boolean {
  return !isOrderEmpty(order) && !order?.paidAt;
}

/**
 * The order is paid *and* there's nothing new pending in the cart - only
 * then does the table truly "close". A paid order with a fresh, unsubmitted
 * cart means the guest is already starting a new round (see orderStore.ts:
 * submitCartItems opens a new Order once the previous one is paid).
 */
export function isOrderSettled(order: Order | null, pendingCartCount: number): boolean {
  return Boolean(order?.paidAt) && pendingCartCount === 0;
}
