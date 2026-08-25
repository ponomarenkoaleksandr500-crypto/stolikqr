// Behavior events only the Guest App can observe (no backend action of its
// own) - reported via POST /analytics/events. SESSION_STARTED/ORDER_CREATED/
// WAITER_CALLED are deliberately excluded here: those are logged server-side
// by AnalyticsService listening to the existing domain events (see
// analytics.service.ts), since the backend already knows them definitively
// and a client ping could be dropped, duplicated, or spoofed.
export const CLIENT_TRACKABLE_EVENT_NAMES = [
  'QR_SCANNED',
  'MENU_OPENED',
  'CATEGORY_VIEWED',
  'DISH_VIEWED',
  'DISH_ADDED_TO_CART',
  'DISH_REMOVED_FROM_CART',
] as const;

export type ClientTrackableEventName =
  (typeof CLIENT_TRACKABLE_EVENT_NAMES)[number];

// Staff-facing daily funnel, mirrors the Demo Platform v1 architecture doc's
// analytics example. Scoped to "today" (server-local midnight to now) - no
// date-range picker in this phase, see AnalyticsService.getSummary.
export interface AnalyticsSummaryDto {
  qrSessions: number;
  menuViews: number;
  categoryViews: number;
  dishViews: number;
  addToCart: number;
  orders: number;
  waiterCalls: number;
  /** orders / qrSessions * 100, rounded to 1 decimal; 0 when qrSessions is 0. */
  conversionRate: number;
}
