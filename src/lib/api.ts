import type { Category, Dish, Restaurant } from "@/types/menu";
import type { LocalizedText } from "@/i18n/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiNotFoundError extends Error {}
export class ApiUnauthorizedError extends Error {}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch (cause) {
    throw new Error(`Failed to reach API at ${API_URL}${path}`, { cause });
  }
  if (res.status === 404) {
    throw new ApiNotFoundError(`Not found: ${path}`);
  }
  if (res.status === 401) {
    throw new ApiUnauthorizedError(`Unauthorized: ${path}`);
  }
  if (!res.ok) {
    // Nest's error responses are JSON ({ message, error, statusCode }) - surface
    // that message (e.g. "This table still has an unpaid order") rather than
    // a generic status-code string, so the UI can show staff/guests *why*.
    const body = await res.text();
    let message = `API request failed (${res.status}): ${path}`;
    try {
      const parsed: unknown = body ? JSON.parse(body) : null;
      if (parsed && typeof parsed === "object" && "message" in parsed) {
        const parsedMessage = (parsed as { message: unknown }).message;
        if (typeof parsedMessage === "string") message = parsedMessage;
      }
    } catch {
      // Not JSON - keep the generic message.
    }
    throw new Error(message);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  // Nest sends an empty body (not just for 204) whenever a handler returns
  // null/undefined - e.g. "no active waiter call" - so res.json() would
  // throw on it. Treat an empty body as null rather than assuming every
  // 2xx response actually has JSON to parse.
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export interface MenuResponse {
  restaurant: Restaurant;
  categories: Category[];
  dishes: Dish[];
}

/** Plain menu browsing without a table — GET /r/[slug]/[categorySlug] today. */
export function fetchMenuByRestaurantSlug(slug: string): Promise<MenuResponse> {
  return apiFetch<MenuResponse>(`/restaurants/${encodeURIComponent(slug)}/menu`, {
    cache: "no-store",
  });
}

/** Table-scoped entry — qrToken alone determines Table -> Location -> Menu. */
export function fetchMenuByQrToken(qrToken: string): Promise<MenuResponse> {
  return apiFetch<MenuResponse>(`/tables/${encodeURIComponent(qrToken)}/menu`, {
    cache: "no-store",
  });
}

/**
 * Translates today's URL shape (/r/[slug]/t/[tableCode]) into the table's
 * qrToken — the one place slug+code are used; everything after this is
 * keyed by qrToken alone (see backend TablesService for the same note).
 */
export function resolveTableByCode(
  slug: string,
  code: string,
): Promise<{ tableId: string; qrToken: string }> {
  return apiFetch<{ tableId: string; qrToken: string }>(
    `/tables/resolve?slug=${encodeURIComponent(slug)}&code=${encodeURIComponent(code)}`,
    { cache: "no-store" },
  );
}

export interface GuestSessionResponse {
  id: string;
  tableId: string;
  startedAt: number;
}

/** Idempotent: the same (qrToken, deviceToken) pair resumes the same open session. */
export function createOrResumeGuestSession(
  qrToken: string,
  deviceToken: string,
): Promise<GuestSessionResponse> {
  return apiFetch<GuestSessionResponse>("/guest-sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qrToken, deviceToken }),
  });
}

export interface CreateOrderItemInput {
  dishId: string;
  quantity: number;
  modifierChoiceIds?: string[];
  excludedIngredientIds?: string[];
}

export interface OrderItemResponse {
  id: string;
  dishId: string;
  dishSlug: string;
  name: LocalizedText;
  emoji: string;
  gradient: string;
  basePrice: number;
  modifiers: {
    groupId: string;
    groupName: LocalizedText;
    choiceId: string;
    choiceName: LocalizedText;
    priceDelta: number;
  }[];
  excludedIngredients: { id: string; name: LocalizedText }[];
  selectionsSummary: LocalizedText;
  excludedSummary: LocalizedText;
  quantity: number;
  lineTotal: number;
  status: string;
  createdAt: number;
}

export interface OrderResponse {
  id: string;
  tableId: string;
  guestSessionId: string | null;
  status: string;
  createdAt: number;
  paidAt: number | null;
  items: OrderItemResponse[];
}

/**
 * Creates one Order (one "submission round" / batch) on the backend. Price,
 * dish/modifier/ingredient identity and names are all recomputed server-side
 * from the real Dish/ModifierChoice/DishIngredient rows - nothing here is
 * trusted from the client beyond dishId/quantity/chosen ids.
 */
export function createOrder(
  guestSessionId: string,
  items: CreateOrderItemInput[],
): Promise<OrderResponse> {
  return apiFetch<OrderResponse>("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guestSessionId, items }),
  });
}

/** All orders for the guest session's table (the table's whole visit, not just this device). */
export function fetchOrdersForGuestSession(guestSessionId: string): Promise<OrderResponse[]> {
  return apiFetch<OrderResponse[]>(`/guest-sessions/${encodeURIComponent(guestSessionId)}/orders`, {
    cache: "no-store",
  });
}

export type ReorderSkipReason = "NOT_FOUND" | "UNAVAILABLE" | "OPTIONS_CHANGED";

export interface ReorderSkippedItem {
  name: LocalizedText;
  quantity: number;
  reason: ReorderSkipReason;
}

export interface ReorderResponse {
  order: OrderResponse | null;
  skippedItems: ReorderSkippedItem[];
}

/**
 * "Order again" (D8): the server re-derives everything from the table's last
 * Order and re-validates it against the LIVE menu - dishId/modifier/ingredient
 * ids only, never the old price. Items that no longer validate (deleted,
 * unavailable, changed modifiers) are skipped individually rather than
 * failing the whole request - see ReorderResponse.skippedItems.
 */
export function reorderLastOrder(guestSessionId: string): Promise<ReorderResponse> {
  return apiFetch<ReorderResponse>(
    `/guest-sessions/${encodeURIComponent(guestSessionId)}/orders/reorder`,
    { method: "POST" },
  );
}

export interface WaiterCallResponse {
  id: string;
  tableId: string;
  guestSessionId: string | null;
  reasonKey: string;
  status: string;
  calledAt: number;
  acceptedAt: number | null;
  inProgressAt: number | null;
  completedAt: number | null;
}

/**
 * Idempotent: a table can only have one active call at a time - if one
 * already exists this returns it as-is (see backend WaiterCallsService).
 */
export function createWaiterCall(
  guestSessionId: string,
  reasonKey: string,
): Promise<WaiterCallResponse> {
  return apiFetch<WaiterCallResponse>("/waiter-calls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guestSessionId, reasonKey }),
  });
}

/** The table's active call (PENDING/ACCEPTED/IN_PROGRESS), or null if none. */
export function fetchActiveWaiterCall(guestSessionId: string): Promise<WaiterCallResponse | null> {
  return apiFetch<WaiterCallResponse | null>(
    `/guest-sessions/${encodeURIComponent(guestSessionId)}/waiter-call/active`,
    { cache: "no-store" },
  );
}

// --- Waiter App (staff-only) ------------------------------------------------

export interface StaffDto {
  id: string;
  name: string;
  email: string;
  restaurantId: string;
  role: "WAITER" | "ADMIN";
}

export interface StaffLoginResponse {
  accessToken: string;
  staff: StaffDto;
}

export function staffLogin(email: string, password: string): Promise<StaffLoginResponse> {
  return apiFetch<StaffLoginResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

// Waiter App floor plan color-coding, priority order highest first - see
// backend StaffService.getOverview for how these are derived.
export type TableFloorStatus = "CALLED_WAITER" | "AWAITING_PAYMENT" | "ORDERED" | "OCCUPIED" | "FREE";

export interface StaffTableDto {
  id: string;
  code: string;
  label: string | null;
  zone: string | null;
  status: TableFloorStatus;
  hasActiveOrder: boolean;
  hasActiveCall: boolean;
}

export interface StaffOverviewResponse {
  tables: StaffTableDto[];
  activeOrders: OrderResponse[];
  activeCalls: WaiterCallResponse[];
}

/** The Waiter App's initial dashboard snapshot; WS pushes keep it live afterward. */
export function fetchStaffOverview(slug: string, token: string): Promise<StaffOverviewResponse> {
  return apiFetch<StaffOverviewResponse>(
    `/restaurants/${encodeURIComponent(slug)}/staff/overview`,
    { headers: authHeaders(token), cache: "no-store" },
  );
}

export function updateOrderStatus(
  orderId: string,
  status: string,
  token: string,
): Promise<OrderResponse> {
  return apiFetch<OrderResponse>(`/orders/${encodeURIComponent(orderId)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ status }),
  });
}

export interface CloseTableResponse {
  id: string;
  closedAt: number;
}

/**
 * "Old guests left, table awaits new ones" - staff-only. Refused (400) while
 * the table still has an unpaid order or an active waiter call; see backend
 * TablesService.close.
 */
export function closeTable(tableId: string, token: string): Promise<CloseTableResponse> {
  return apiFetch<CloseTableResponse>(`/tables/${encodeURIComponent(tableId)}/close`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

/** Waiter App table detail: the table's current-visit orders (same scoping as the guest's own order view). */
export function fetchOrdersForTable(tableId: string, token: string): Promise<OrderResponse[]> {
  return apiFetch<OrderResponse[]>(`/tables/${encodeURIComponent(tableId)}/orders`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
}

export function updateWaiterCallStatus(
  callId: string,
  status: string,
  token: string,
): Promise<WaiterCallResponse> {
  return apiFetch<WaiterCallResponse>(`/waiter-calls/${encodeURIComponent(callId)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ status }),
  });
}

// --- Payments ---------------------------------------------------------------

export interface PaymentResponse {
  id: string;
  tableId: string;
  provider: string;
  amount: number;
  status: string;
  createdAt: number;
  confirmedAt: number | null;
}

/** Guest self-checkout methods (see backend CreatePaymentDto) - stubs for now, no real gateway wired up. */
export type PaymentMethod = "CARD" | "APPLE_PAY" | "GOOGLE_PAY" | "EXPIRENZA";

/**
 * Requests payment for the table's whole current open tab (every unpaid
 * order, summed). Called two ways: with no `method` from the "bring the
 * bill" waiter-call flow (settles asynchronously, see paymentStore.ts), or
 * with a guest-chosen `method` from the Cart (settles instantly - see
 * backend PaymentsService.create for why).
 */
export function createPayment(
  guestSessionId: string,
  method?: PaymentMethod,
): Promise<PaymentResponse> {
  return apiFetch<PaymentResponse>(
    `/guest-sessions/${encodeURIComponent(guestSessionId)}/payments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: method }),
    },
  );
}

export function fetchLatestPayment(guestSessionId: string): Promise<PaymentResponse | null> {
  return apiFetch<PaymentResponse | null>(
    `/guest-sessions/${encodeURIComponent(guestSessionId)}/payments/latest`,
    { cache: "no-store" },
  );
}

export function refundPayment(paymentId: string, token: string): Promise<PaymentResponse> {
  return apiFetch<PaymentResponse>(`/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    headers: authHeaders(token),
  });
}

// --- Analytics ---------------------------------------------------------------

export type ClientTrackableEventName =
  | "QR_SCANNED"
  | "MENU_OPENED"
  | "CATEGORY_VIEWED"
  | "DISH_VIEWED"
  | "DISH_ADDED_TO_CART"
  | "DISH_REMOVED_FROM_CART";

export interface TrackEventInput {
  name: ClientTrackableEventName;
  restaurantId: string;
  tableId?: string;
  guestSessionId?: string;
  dishId?: string;
  payload?: Record<string, unknown>;
}

/**
 * Fire-and-forget: an analytics ping must never block or break the guest
 * experience, so failures (network, 404 for a stale restaurantId, etc.) are
 * swallowed silently rather than surfaced anywhere.
 */
export function trackEvent(input: TrackEventInput): void {
  void apiFetch<void>("/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).catch(() => {
    // Best-effort only - see docstring above.
  });
}

export interface RankedStatResponse {
  name: LocalizedText;
  count: number;
}

export interface StaffAnalyticsSummaryResponse {
  qrSessions: number;
  menuViews: number;
  categoryViews: number;
  dishViews: number;
  addToCart: number;
  orders: number;
  waiterCalls: number;
  conversionRate: number;
  averageOrderValue: number;
  topViewedDishes: RankedStatResponse[];
  topAddedToCartDishes: RankedStatResponse[];
  topOrderedDishes: RankedStatResponse[];
  topModifiers: RankedStatResponse[];
}

export function fetchStaffAnalytics(
  slug: string,
  token: string,
): Promise<StaffAnalyticsSummaryResponse> {
  return apiFetch<StaffAnalyticsSummaryResponse>(
    `/restaurants/${encodeURIComponent(slug)}/staff/analytics`,
    { headers: authHeaders(token), cache: "no-store" },
  );
}

// --- Stop-list ---------------------------------------------------------------

export interface StaffDishResponse {
  id: string;
  name: LocalizedText;
  categoryName: LocalizedText;
  isAvailable: boolean;
}

export function fetchStaffDishList(slug: string, token: string): Promise<StaffDishResponse[]> {
  return apiFetch<StaffDishResponse[]>(`/restaurants/${encodeURIComponent(slug)}/staff/dishes`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
}

export function updateDishAvailability(
  dishId: string,
  isAvailable: boolean,
  token: string,
): Promise<StaffDishResponse> {
  return apiFetch<StaffDishResponse>(`/dishes/${encodeURIComponent(dishId)}/availability`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ isAvailable }),
  });
}

// --- Admin App: menu editor ---------------------------------------------------

export interface AdminCategoryResponse {
  id: string;
  slug: string;
  name: LocalizedText;
  dishCount: number;
}

export interface AdminDishSummaryResponse {
  id: string;
  slug: string;
  name: LocalizedText;
  categoryId: string;
  price: number;
  emoji: string;
  photoUrl?: string;
  isAvailable: boolean;
  featured: boolean;
}

export function fetchAdminCategories(slug: string, token: string): Promise<AdminCategoryResponse[]> {
  return apiFetch<AdminCategoryResponse[]>(`/admin/categories?slug=${encodeURIComponent(slug)}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
}

export function createCategory(
  slug: string,
  name: LocalizedText,
  token: string,
): Promise<AdminCategoryResponse> {
  return apiFetch<AdminCategoryResponse>(`/admin/categories?slug=${encodeURIComponent(slug)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ name }),
  });
}

export function renameCategory(
  categoryId: string,
  name: LocalizedText,
  token: string,
): Promise<AdminCategoryResponse> {
  return apiFetch<AdminCategoryResponse>(`/admin/categories/${encodeURIComponent(categoryId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ name }),
  });
}

export function deleteCategory(categoryId: string, token: string): Promise<void> {
  return apiFetch<void>(`/admin/categories/${encodeURIComponent(categoryId)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function fetchAdminDishes(slug: string, token: string): Promise<AdminDishSummaryResponse[]> {
  return apiFetch<AdminDishSummaryResponse[]>(`/admin/dishes?slug=${encodeURIComponent(slug)}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
}

/** Full editable detail - same shape as the guest-facing Dish (see @/types/menu), reused as-is. */
export function fetchAdminDish(dishId: string, token: string): Promise<Dish> {
  return apiFetch<Dish>(`/admin/dishes/${encodeURIComponent(dishId)}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
}

export interface CreateDishInput {
  name: LocalizedText;
  description?: LocalizedText;
  price: number;
  categoryId: string;
  emoji?: string;
  gradient?: string;
  featured?: boolean;
}

export function createDish(input: CreateDishInput, token: string): Promise<Dish> {
  return apiFetch<Dish>("/admin/dishes", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(input),
  });
}

export function updateDish(
  dishId: string,
  input: Partial<CreateDishInput>,
  token: string,
): Promise<Dish> {
  return apiFetch<Dish>(`/admin/dishes/${encodeURIComponent(dishId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(input),
  });
}

export function deleteDish(dishId: string, token: string): Promise<void> {
  return apiFetch<void>(`/admin/dishes/${encodeURIComponent(dishId)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function updateTheme(themeKey: string, token: string): Promise<{ themeKey: string }> {
  return apiFetch<{ themeKey: string }>("/admin/theme", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ themeKey }),
  });
}

export function uploadDishPhoto(dishId: string, file: File, token: string): Promise<Dish> {
  const formData = new FormData();
  formData.append("photo", file);
  // No Content-Type header here - the browser sets the multipart boundary itself.
  return apiFetch<Dish>(`/admin/dishes/${encodeURIComponent(dishId)}/photo`, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });
}

export function deleteDishPhoto(dishId: string, token: string): Promise<Dish> {
  return apiFetch<Dish>(`/admin/dishes/${encodeURIComponent(dishId)}/photo`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

// --- Admin App: ingredients + modifiers (each call returns the full updated Dish) --------

export interface IngredientInput {
  name: LocalizedText;
  icon?: string;
  removable?: boolean;
}

export function addIngredient(
  dishId: string,
  input: IngredientInput,
  token: string,
): Promise<Dish> {
  return apiFetch<Dish>(`/admin/dishes/${encodeURIComponent(dishId)}/ingredients`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(input),
  });
}

export function updateIngredient(
  dishId: string,
  ingredientId: string,
  input: Partial<IngredientInput>,
  token: string,
): Promise<Dish> {
  return apiFetch<Dish>(
    `/admin/dishes/${encodeURIComponent(dishId)}/ingredients/${encodeURIComponent(ingredientId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify(input),
    },
  );
}

export function removeIngredient(
  dishId: string,
  ingredientId: string,
  token: string,
): Promise<Dish> {
  return apiFetch<Dish>(
    `/admin/dishes/${encodeURIComponent(dishId)}/ingredients/${encodeURIComponent(ingredientId)}`,
    { method: "DELETE", headers: authHeaders(token) },
  );
}

export interface ModifierGroupInput {
  name: LocalizedText;
  required?: boolean;
  multiple?: boolean;
}

export function addModifierGroup(
  dishId: string,
  input: ModifierGroupInput,
  token: string,
): Promise<Dish> {
  return apiFetch<Dish>(`/admin/dishes/${encodeURIComponent(dishId)}/modifier-groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(input),
  });
}

export function updateModifierGroup(
  dishId: string,
  groupId: string,
  input: Partial<ModifierGroupInput>,
  token: string,
): Promise<Dish> {
  return apiFetch<Dish>(
    `/admin/dishes/${encodeURIComponent(dishId)}/modifier-groups/${encodeURIComponent(groupId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify(input),
    },
  );
}

export function removeModifierGroup(
  dishId: string,
  groupId: string,
  token: string,
): Promise<Dish> {
  return apiFetch<Dish>(
    `/admin/dishes/${encodeURIComponent(dishId)}/modifier-groups/${encodeURIComponent(groupId)}`,
    { method: "DELETE", headers: authHeaders(token) },
  );
}

export interface ModifierChoiceInput {
  name: LocalizedText;
  priceDelta?: number;
  exclusive?: boolean;
}

export function addModifierChoice(
  groupId: string,
  input: ModifierChoiceInput,
  token: string,
): Promise<Dish> {
  return apiFetch<Dish>(`/admin/modifier-groups/${encodeURIComponent(groupId)}/choices`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(input),
  });
}

export function updateModifierChoice(
  groupId: string,
  choiceId: string,
  input: Partial<ModifierChoiceInput>,
  token: string,
): Promise<Dish> {
  return apiFetch<Dish>(
    `/admin/modifier-groups/${encodeURIComponent(groupId)}/choices/${encodeURIComponent(choiceId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify(input),
    },
  );
}

export function removeModifierChoice(
  groupId: string,
  choiceId: string,
  token: string,
): Promise<Dish> {
  return apiFetch<Dish>(
    `/admin/modifier-groups/${encodeURIComponent(groupId)}/choices/${encodeURIComponent(choiceId)}`,
    { method: "DELETE", headers: authHeaders(token) },
  );
}
