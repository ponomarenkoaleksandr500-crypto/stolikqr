"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { io, type Socket } from "socket.io-client";
import {
  ApiUnauthorizedError,
  closeTable,
  fetchOrdersForTable,
  fetchStaffOverview,
  updateOrderStatus,
  type OrderResponse,
  type StaffTableDto,
} from "@/lib/api";
import { clearStaffSession, getStaffToken, getStoredStaff } from "@/lib/staffAuth";
import { formatPrice, formatRelativeTimeUk } from "@/lib/format";
import { PotIcon } from "@/components/table/tableIcons";
import { CheckIcon, ChevronRightIcon } from "@/components/icons";
import { WaiterOrderItem } from "@/components/waiter/WaiterOrderItem";

// Demo Platform v1 is single-tenant - see stolikqr/src/app/page.tsx for the
// same constant used on the Guest App side.
const DEMO_RESTAURANT_SLUG = "demo-restaurant";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Mirrors src/app/waiter/page.tsx's close-confirm window.
const CLOSE_CONFIRM_TIMEOUT_MS = 4_000;

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

const CLOSE_TABLE_ERROR_LABEL: Record<string, string> = {
  "This table still has an unpaid order - settle it before closing":
    "Спочатку розрахуйте гостей — на столі є неоплачене замовлення",
  "This table still has an active waiter call - resolve it before closing":
    "Спочатку закрийте активний виклик офіціанта на цьому столі",
};
const CLOSE_TABLE_ERROR_FALLBACK = "Не вдалося закрити стіл";

export default function TableDetailPage() {
  const params = useParams<{ id: string }>();
  const tableId = params.id;
  const router = useRouter();

  const [table, setTable] = useState<StaffTableDto | null>(null);
  const [orders, setOrders] = useState<OrderResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const confirmCloseTimeoutRef = useRef<number | null>(null);
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
      const [overview, tableOrders] = await Promise.all([
        fetchStaffOverview(DEMO_RESTAURANT_SLUG, token),
        fetchOrdersForTable(tableId, token),
      ]);
      const found = overview.tables.find((t) => t.id === tableId) ?? null;
      if (!found) {
        setError("Стіл не знайдено.");
        return;
      }
      setTable(found);
      setOrders(tableOrders);
      setError(null);
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) {
        goToLogin();
        return;
      }
      setError("Не вдалося завантажити стіл. Перевірте з'єднання.");
      console.error(err);
    }
  }, [goToLogin, tableId]);

  useEffect(() => {
    const staff = getStoredStaff();
    const token = getStaffToken();
    if (!staff || !token) {
      goToLogin();
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    socket.on("table.closed", onChange);

    return () => {
      socket.close();
      socketRef.current = null;
      if (confirmCloseTimeoutRef.current) window.clearTimeout(confirmCloseTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount, refresh is stable via useCallback
  }, [tableId]);

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

  const handleCloseClick = () => {
    if (!table || table.hasActiveOrder || table.hasActiveCall || closing) return;
    if (!confirmingClose) {
      setCloseError(null);
      setConfirmingClose(true);
      if (confirmCloseTimeoutRef.current) window.clearTimeout(confirmCloseTimeoutRef.current);
      confirmCloseTimeoutRef.current = window.setTimeout(
        () => setConfirmingClose(false),
        CLOSE_CONFIRM_TIMEOUT_MS,
      );
      return;
    }
    if (confirmCloseTimeoutRef.current) window.clearTimeout(confirmCloseTimeoutRef.current);
    setConfirmingClose(false);
    void closeConfirmed();
  };

  const closeConfirmed = async () => {
    const token = getStaffToken();
    if (!token) return;
    setClosing(true);
    setCloseError(null);
    try {
      await closeTable(tableId, token);
      void refresh();
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) goToLogin();
      else {
        const message = err instanceof Error ? err.message : null;
        setCloseError((message && CLOSE_TABLE_ERROR_LABEL[message]) || CLOSE_TABLE_ERROR_FALLBACK);
      }
    } finally {
      setClosing(false);
    }
  };

  const blocked = table ? table.hasActiveOrder || table.hasActiveCall : true;

  return (
    <div className="min-h-dvh bg-paper pb-16">
      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-ink-100 bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/waiter"
            aria-label="До панелі"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-50"
          >
            <ChevronRightIcon className="h-5 w-5 rotate-180" />
          </Link>
          <div>
            <p className="font-display text-lg font-semibold text-ink-900">
              {table?.label ?? `Стіл ${table?.code ?? "…"}`}
            </p>
            {table?.zone && <p className="text-xs text-ink-600">{table.zone}</p>}
          </div>
        </div>
        <button
          type="button"
          disabled={blocked || closing}
          onClick={handleCloseClick}
          title={
            blocked
              ? "Спочатку розрахуйте гостей і закрийте активний виклик"
              : confirmingClose
                ? "Натисніть ще раз, щоб підтвердити закриття"
                : "Закрити стіл (гості пішли)"
          }
          className={`flex h-11 w-full shrink-0 items-center justify-center rounded-full border px-4 text-xs font-semibold transition-colors sm:w-auto ${
            confirmingClose
              ? "border-danger-500/40 bg-danger-50 text-danger-700"
              : "border-ink-200 bg-surface text-ink-600 hover:bg-ink-50"
          } ${blocked ? "cursor-not-allowed opacity-70" : "cursor-pointer"} ${closing ? "opacity-50" : ""}`}
        >
          {confirmingClose ? "Підтвердити?" : "Закрити стіл"}
        </button>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-5">
        {error && (
          <div className="rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-700">
            {error}
          </div>
        )}
        {closeError && (
          <div className="rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-700">
            {closeError}
          </div>
        )}

        {!orders && !error && <p className="text-sm text-ink-600">Завантаження…</p>}

        {orders?.length === 0 && (
          <p className="text-sm text-ink-600">На цьому столі ще немає замовлень.</p>
        )}

        {orders?.map((order) => {
          const total = order.items.reduce((sum, item) => sum + item.lineTotal, 0);
          return (
            <div key={order.id} className="rounded-lg border border-ink-100 bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-50 text-ink-600">
                    <PotIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs text-ink-600">
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
                  <WaiterOrderItem key={item.id} item={item} />
                ))}
              </ul>

              {ORDER_NEXT_STATUS[order.status] && (
                <button
                  type="button"
                  onClick={() => void advanceOrder(order)}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-accent-600 text-xs font-semibold text-on-accent transition-colors hover:bg-accent-700"
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                  {ORDER_ACTION_LABEL[order.status]}
                </button>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
}
