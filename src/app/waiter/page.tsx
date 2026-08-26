"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { io, type Socket } from "socket.io-client";
import {
  ApiUnauthorizedError,
  fetchMenuByRestaurantSlug,
  fetchStaffOverview,
  updateOrderStatus,
  updateWaiterCallStatus,
  type OrderResponse,
  type StaffOverviewResponse,
  type StaffTableDto,
  type TableFloorStatus,
  type WaiterCallResponse,
} from "@/lib/api";
import { clearStaffSession, getStaffToken, getStoredStaff, type StoredStaff } from "@/lib/staffAuth";
import { formatPrice, formatRelativeTimeUk } from "@/lib/format";
import { BellIcon, PotIcon, ReceiptCheckIcon } from "@/components/table/tableIcons";
import { CheckIcon } from "@/components/icons";

// Demo Platform v1 is single-tenant - see stolikqr/src/app/page.tsx for the
// same constant used on the Guest App side.
const DEMO_RESTAURANT_SLUG = "demo-restaurant";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const ORDER_STATUS_LABEL: Record<string, string> = {
  NEW: "Новий",
  ACCEPTED: "Прийнято",
  PREPARING: "Готується",
  READY: "Готово",
  SERVED: "Видано",
};
const ORDER_NEXT_STATUS: Record<string, string> = {
  NEW: "ACCEPTED",
  ACCEPTED: "PREPARING",
  PREPARING: "READY",
  READY: "SERVED",
};
const ORDER_ACTION_LABEL: Record<string, string> = {
  NEW: "Прийняти",
  ACCEPTED: "Почати готувати",
  PREPARING: "Готово",
  READY: "Видати",
};

// Mirrors the guest-facing reason keys from src/table/waiterReasons.ts -
// staff must never see the raw English key ("help", "water", ...).
const CALL_REASON_LABEL: Record<string, string> = {
  help: "Потрібна допомога",
  bill: "Рахунок",
  water: "Принести воду",
  clean: "Прибрати зі столу",
  other: "Виклик офіціанта",
};

const CALL_STATUS_LABEL: Record<string, string> = {
  PENDING: "Очікує",
  ACCEPTED: "Прийнято",
  IN_PROGRESS: "В процесі",
  COMPLETED: "Завершено",
};
const CALL_NEXT_STATUS: Record<string, string> = {
  PENDING: "ACCEPTED",
  ACCEPTED: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
};
const CALL_ACTION_LABEL: Record<string, string> = {
  PENDING: "Прийняти виклик",
  ACCEPTED: "Я йду",
  IN_PROGRESS: "Завершити",
};

// Floor plan color-coding - priority order matches backend StaffService's
// derivation (a table's `status` is already the single winning state).
const TABLE_STATUS_STYLE: Record<TableFloorStatus, string> = {
  CALLED_WAITER: "border-accent-300 bg-accent-50 text-accent-700",
  AWAITING_PAYMENT: "border-gold-300 bg-gold-100 text-gold-700",
  ORDERED: "border-sage-600/30 bg-sage-100 text-sage-700",
  OCCUPIED: "border-ink-300 bg-ink-100 text-ink-700",
  FREE: "border-ink-200 bg-surface text-ink-700 hover:border-ink-300",
};
const TABLE_STATUS_LABEL: Record<TableFloorStatus, string> = {
  CALLED_WAITER: "Викликає офіціанта",
  AWAITING_PAYMENT: "Очікує оплату",
  ORDERED: "Замовлення в процесі",
  OCCUPIED: "Гості за столом",
  FREE: "Вільний",
};

/** Floor plan grouping - tables already arrive sorted by code (see StaffService.getOverview). */
function groupTablesByZone(tables: StaffTableDto[]): { name: string; tables: StaffTableDto[] }[] {
  const groups: { name: string; tables: StaffTableDto[] }[] = [];
  for (const table of tables) {
    const name = table.zone ?? "Столи";
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.tables.push(table);
    else groups.push({ name, tables: [table] });
  }
  return groups;
}

export default function WaiterDashboardPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StoredStaff | null>(null);
  const [overview, setOverview] = useState<StaffOverviewResponse | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  const goToLogin = useCallback(() => {
    clearStaffSession();
    router.replace("/waiter/login");
  }, [router]);

  const refresh = useCallback(async () => {
    const token = getStaffToken();
    if (!token) {
      goToLogin();
      return;
    }
    try {
      const data = await fetchStaffOverview(DEMO_RESTAURANT_SLUG, token);
      setOverview(data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) {
        goToLogin();
        return;
      }
      setError("Не вдалося завантажити дані. Перевірте з'єднання.");
      console.error(err);
    }
  }, [goToLogin]);

  useEffect(() => {
    const storedStaff = getStoredStaff();
    const token = getStaffToken();
    if (!storedStaff || !token) {
      goToLogin();
      return;
    }
    // One-time client-only auth gate (localStorage isn't available during
    // SSR) - not reactive external state to keep in sync, so an effect is
    // the right tool here, unlike the useSyncExternalStore-based stores
    // (tableStore.ts etc.) that track state changing throughout the session.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStaff(storedStaff);
    void refresh();
    void fetchMenuByRestaurantSlug(DEMO_RESTAURANT_SLUG).then(
      (menu) => setRestaurantName(menu.restaurant.name.uk),
      (err: unknown) => console.error("Failed to load restaurant name", err),
    );

    const socket = io(`${API_URL}/ws/staff`, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;
    const onChange = () => void refresh();
    socket.on("order.created", onChange);
    socket.on("order.status.updated", onChange);
    socket.on("waiterCall.created", onChange);
    socket.on("waiterCall.status.updated", onChange);
    socket.on("payment.status.updated", onChange);
    socket.on("table.closed", onChange);

    // Re-renders the "N хв тому" labels periodically - the underlying data
    // only refetches on a real socket event, but elapsed time keeps moving
    // regardless, so a call sitting unanswered doesn't look frozen at "щойно".
    const tickInterval = window.setInterval(() => setTick((n) => n + 1), 30_000);

    return () => {
      socket.close();
      socketRef.current = null;
      window.clearInterval(tickInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount, refresh is stable via useCallback
  }, []);

  const handleLogout = () => {
    socketRef.current?.close();
    goToLogin();
  };

  const advanceOrder = async (order: OrderResponse) => {
    const token = getStaffToken();
    const next = ORDER_NEXT_STATUS[order.status];
    if (!token || !next) return;
    try {
      await updateOrderStatus(order.id, next, token);
      void refresh();
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) goToLogin();
      else console.error(err);
    }
  };

  const advanceCall = async (call: WaiterCallResponse) => {
    const token = getStaffToken();
    const next = CALL_NEXT_STATUS[call.status];
    if (!token || !next) return;
    try {
      await updateWaiterCallStatus(call.id, next, token);
      void refresh();
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) goToLogin();
      else console.error(err);
    }
  };

  if (!staff) return null;

  const tableById = new Map<string, StaffTableDto>(overview?.tables.map((t) => [t.id, t]) ?? []);
  const tableLabel = (tableId: string) => {
    const table = tableById.get(tableId);
    return table?.label ?? (table ? `Стіл ${table.code}` : tableId);
  };

  return (
    <div className="min-h-screen bg-paper pb-16">
      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-ink-100 bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg font-semibold text-ink-900">
            {restaurantName ?? "…"}
          </p>
          <p className="text-xs text-ink-500">{staff.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/waiter/stop-list"
            className="flex h-11 items-center rounded-full border border-ink-200 px-4 text-xs font-semibold text-ink-600 transition-colors hover:bg-ink-50"
          >
            Стоп-лист
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-11 items-center rounded-full border border-ink-200 px-4 text-xs font-semibold text-ink-600 transition-colors hover:bg-ink-50"
          >
            Вийти
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-5">
        {error && (
          <div className="rounded-2xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-700">
            {error}
          </div>
        )}

        {!overview && !error && <p className="text-sm text-ink-600">Завантаження…</p>}

        {overview && (
          <section className="flex flex-col gap-5">
            {groupTablesByZone(overview.tables).map((zone) => (
              <div key={zone.name}>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-600">
                  {zone.name}
                </h2>
                <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {zone.tables.map((table) => (
                    <Link
                      key={table.id}
                      href={`/waiter/tables/${table.id}`}
                      title={TABLE_STATUS_LABEL[table.status]}
                      className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-2xl border text-sm font-semibold transition-colors ${TABLE_STATUS_STYLE[table.status]}`}
                    >
                      {table.status === "CALLED_WAITER" && (
                        <BellIcon className="absolute right-1.5 top-1.5 h-3.5 w-3.5" />
                      )}
                      {table.status === "AWAITING_PAYMENT" && (
                        <ReceiptCheckIcon className="absolute right-1.5 top-1.5 h-3.5 w-3.5" />
                      )}
                      {table.code}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
              {(Object.keys(TABLE_STATUS_LABEL) as TableFloorStatus[]).map((status) => (
                <span key={status} className="flex items-center gap-1.5 text-xs text-ink-600">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full border ${TABLE_STATUS_STYLE[status]}`}
                  />
                  {TABLE_STATUS_LABEL[status]}
                </span>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-600">
            Виклики {overview ? `(${overview.activeCalls.length})` : ""}
          </h2>
          <div className="mt-2 flex flex-col gap-3">
            {overview?.activeCalls.length === 0 && (
              <p className="text-sm text-ink-600">Активних викликів немає</p>
            )}
            {overview?.activeCalls.map((call) => (
              <div
                key={call.id}
                className="animate-card-in flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-surface p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                    <BellIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display font-semibold text-ink-900">{tableLabel(call.tableId)}</p>
                    <p className="text-xs text-ink-500">
                      {CALL_REASON_LABEL[call.reasonKey] ?? call.reasonKey} ·{" "}
                      {CALL_STATUS_LABEL[call.status] ?? call.status} ·{" "}
                      {formatRelativeTimeUk(call.calledAt)}
                    </p>
                  </div>
                </div>
                {CALL_NEXT_STATUS[call.status] && (
                  <button
                    type="button"
                    onClick={() => void advanceCall(call)}
                    className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-accent-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-accent-700"
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                    {CALL_ACTION_LABEL[call.status]}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-600">
            Замовлення {overview ? `(${overview.activeOrders.length})` : ""}
          </h2>
          <div className="mt-2 flex flex-col gap-3">
            {overview?.activeOrders.length === 0 && (
              <p className="text-sm text-ink-600">Активних замовлень немає</p>
            )}
            {overview?.activeOrders.map((order) => {
              const total = order.items.reduce((sum, item) => sum + item.lineTotal, 0);
              return (
                <div
                  key={order.id}
                  className="animate-card-in rounded-2xl border border-ink-100 bg-surface p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-50 text-ink-500">
                        <PotIcon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-display font-semibold text-ink-900">
                          {tableLabel(order.tableId)}
                        </p>
                        <p className="text-xs text-ink-500">
                          {ORDER_STATUS_LABEL[order.status] ?? order.status} ·{" "}
                          {formatRelativeTimeUk(order.createdAt)}
                          {order.paidAt && (
                            <span className="ml-1.5 inline-flex items-center rounded-full bg-sage-100 px-2 py-0.5 text-[10px] font-semibold text-sage-700">
                              Оплачено
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="font-display font-semibold tabular-nums text-ink-900">
                      {formatPrice(total)}
                    </span>
                  </div>

                  <ul className="mt-3 divide-y divide-ink-100 border-t border-ink-100">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                        <span className="text-ink-700">
                          {item.quantity} × {item.name.uk}
                        </span>
                        <span className="tabular-nums text-ink-500">{formatPrice(item.lineTotal)}</span>
                      </li>
                    ))}
                  </ul>

                  {ORDER_NEXT_STATUS[order.status] && (
                    <button
                      type="button"
                      onClick={() => void advanceOrder(order)}
                      className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-accent-600 text-xs font-semibold text-white transition-colors hover:bg-accent-700"
                    >
                      <CheckIcon className="h-3.5 w-3.5" />
                      {ORDER_ACTION_LABEL[order.status]}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
