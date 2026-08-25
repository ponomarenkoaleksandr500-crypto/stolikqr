"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { io, type Socket } from "socket.io-client";
import {
  ApiUnauthorizedError,
  fetchStaffOverview,
  updateOrderStatus,
  updateWaiterCallStatus,
  type OrderResponse,
  type StaffOverviewResponse,
  type StaffTableDto,
  type WaiterCallResponse,
} from "@/lib/api";
import { clearStaffSession, getStaffToken, getStoredStaff, type StoredStaff } from "@/lib/staffAuth";
import { formatPrice } from "@/lib/format";
import { BellIcon, PotIcon } from "@/components/table/tableIcons";
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

export default function WaiterDashboardPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StoredStaff | null>(null);
  const [overview, setOverview] = useState<StaffOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
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

    return () => {
      socket.close();
      socketRef.current = null;
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
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-100 bg-surface px-5 py-4">
        <div>
          <p className="font-display text-lg font-semibold text-ink-900">StolikQR — Персонал</p>
          <p className="text-xs text-ink-500">{staff.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/waiter/analytics"
            className="flex h-9 items-center rounded-full border border-ink-200 px-4 text-xs font-semibold text-ink-600 transition-colors hover:bg-ink-50"
          >
            Аналітика
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-9 items-center rounded-full border border-ink-200 px-4 text-xs font-semibold text-ink-600 transition-colors hover:bg-ink-50"
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

        {overview && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400">Столи</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {overview.tables.map((table) => (
                <span
                  key={table.id}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    table.hasActiveCall
                      ? "border-accent-300 bg-accent-50 text-accent-700"
                      : table.hasActiveOrder
                        ? "border-sage-600/30 bg-sage-100 text-sage-700"
                        : "border-ink-200 bg-surface text-ink-500"
                  }`}
                >
                  {table.label ?? `Стіл ${table.code}`}
                  {table.hasActiveCall && <BellIcon className="h-3 w-3" />}
                </span>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Виклики {overview ? `(${overview.activeCalls.length})` : ""}
          </h2>
          <div className="mt-2 flex flex-col gap-3">
            {overview?.activeCalls.length === 0 && (
              <p className="text-sm text-ink-400">Активних викликів немає</p>
            )}
            {overview?.activeCalls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-surface p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                    <BellIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display font-semibold text-ink-900">{tableLabel(call.tableId)}</p>
                    <p className="text-xs text-ink-500">
                      {call.reasonKey} · {CALL_STATUS_LABEL[call.status] ?? call.status}
                    </p>
                  </div>
                </div>
                {CALL_NEXT_STATUS[call.status] && (
                  <button
                    type="button"
                    onClick={() => void advanceCall(call)}
                    className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-accent-500 px-4 text-xs font-semibold text-white transition-colors hover:bg-accent-600"
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
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Замовлення {overview ? `(${overview.activeOrders.length})` : ""}
          </h2>
          <div className="mt-2 flex flex-col gap-3">
            {overview?.activeOrders.length === 0 && (
              <p className="text-sm text-ink-400">Активних замовлень немає</p>
            )}
            {overview?.activeOrders.map((order) => {
              const total = order.items.reduce((sum, item) => sum + item.lineTotal, 0);
              return (
                <div key={order.id} className="rounded-2xl border border-ink-100 bg-surface p-4">
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
                          {ORDER_STATUS_LABEL[order.status] ?? order.status}
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
                      className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-accent-500 text-xs font-semibold text-white transition-colors hover:bg-accent-600"
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
