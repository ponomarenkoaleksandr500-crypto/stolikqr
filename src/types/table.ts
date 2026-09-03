import type { CartItem } from "@/cart/types";

/**
 * A physical table at a restaurant. Resolved from the QR code's URL segment.
 * No real registry exists yet - `resolveTable` in TableSessionProvider.tsx
 * constructs this on the fly so the shape is ready for a future API call.
 */
export interface Table {
  id: string;
  restaurantSlug: string;
  code: string;
}

/** Anonymous "this phone is at this table" session, mirrors the cart's localStorage pattern. */
export interface GuestSession {
  id: string;
  restaurantSlug: string;
  tableCode: string;
  startedAt: number;
}

/** Kitchen-facing progress of a submitted dish. "paid" lives on the Order itself, not per item. */
export type KitchenStatus = "accepted" | "preparing" | "ready" | "served";

/** Every guest-visible stage, including the order-level "paid" stage. */
export type OrderStageStatus = KitchenStatus | "paid";

/**
 * A dish that has been sent to the kitchen. Extends CartItem rather than
 * duplicating it - same dish/selections/excluded-ingredients shape, plus
 * kitchen status and which submission round ("batch") it belongs to.
 */
export interface OrderItem extends CartItem {
  status: KitchenStatus;
  batchIndex: number;
}

/**
 * One table's cumulative order for the current visit.
 *
 * `tableId` is the owner (an Order belongs to a Table); `sessionId` is only
 * provenance metadata for "which device most recently submitted to it" and
 * must never be treated as ownership - see src/table/tableStore.ts, which
 * clears any order left over from a different table.
 */
export interface Order {
  id: string;
  tableId: string;
  sessionId: string;
  items: OrderItem[];
  createdAt: number;
  paidAt: number | null;
  paidMode: string | null;
}
