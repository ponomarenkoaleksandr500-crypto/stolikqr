"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiUnauthorizedError,
  fetchStaffAnalytics,
  type RankedStatResponse,
  type StaffAnalyticsSummaryResponse,
} from "@/lib/api";
import { getStaffToken } from "@/lib/staffAuth";
import { formatPrice } from "@/lib/format";
import { useAdminSession } from "@/lib/useAdminSession";
import { AdminHeader } from "@/components/admin/AdminHeader";

// Demo Platform v1 is single-tenant - see stolikqr/src/app/page.tsx for the
// same constant used on the Guest App side.
const DEMO_RESTAURANT_SLUG = "demo-restaurant";

const METRIC_CARDS: {
  key:
    | "qrSessions"
    | "menuViews"
    | "categoryViews"
    | "dishViews"
    | "addToCart"
    | "orders"
    | "waiterCalls";
  label: string;
}[] = [
  { key: "qrSessions", label: "QR-сесії" },
  { key: "menuViews", label: "Відкриття меню" },
  { key: "categoryViews", label: "Перегляди категорій" },
  { key: "dishViews", label: "Перегляди страв" },
  { key: "addToCart", label: "Додано в кошик" },
  { key: "orders", label: "Замовлення" },
  { key: "waiterCalls", label: "Виклики офіціанта" },
];

const RANKING_LISTS: {
  key: "topOrderedDishes" | "topViewedDishes" | "topAddedToCartDishes" | "topModifiers";
  title: string;
  emptyHint: string;
}[] = [
  { key: "topOrderedDishes", title: "Найпопулярніші страви", emptyHint: "Ще немає замовлень" },
  { key: "topViewedDishes", title: "Найчастіше переглядають", emptyHint: "Ще немає переглядів" },
  { key: "topAddedToCartDishes", title: "Найчастіше додають у кошик", emptyHint: "Ще нічого не додавали" },
  { key: "topModifiers", title: "Популярні модифікатори", emptyHint: "Ще немає вибраних модифікаторів" },
];

function RankedList({ title, rows, emptyHint }: { title: string; rows: RankedStatResponse[]; emptyHint: string }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-ink-600">{emptyHint}</p>
      ) : (
        <ol className="mt-2 flex flex-col gap-1.5">
          {rows.map((row, index) => (
            <li key={index} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-ink-700">
                {index + 1}. {row.name.uk}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-ink-900">{row.count}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { staff, restaurantName, logout } = useAdminSession();
  const [summary, setSummary] = useState<StaffAnalyticsSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = getStaffToken();
    if (!token) {
      logout();
      return;
    }
    try {
      const data = await fetchStaffAnalytics(DEMO_RESTAURANT_SLUG, token);
      setSummary(data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) {
        logout();
        return;
      }
      setError("Не вдалося завантажити аналітику. Перевірте з'єднання.");
      console.error(err);
    }
  }, [logout]);

  useEffect(() => {
    if (!staff) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh()'s setState calls only happen after its internal await
    void refresh();
  }, [staff, refresh]);

  if (!staff) return null;

  return (
    <div className="min-h-dvh bg-paper pb-16">
      <AdminHeader restaurantName={restaurantName} staffName={staff.name} onLogout={logout} />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-5">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-lg font-semibold text-ink-900">Аналітика · Сьогодні</h1>
          <button
            type="button"
            onClick={() => void refresh()}
            className="flex h-11 items-center rounded-full bg-ink-950 px-4 text-xs font-semibold text-paper transition-colors hover:bg-ink-800"
          >
            Оновити
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-700">
            {error}
          </div>
        )}

        {!summary && !error && <p className="text-sm text-ink-600">Завантаження…</p>}

        {summary && (
          <>
            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-ink-100 bg-surface p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">
                  Конверсія в замовлення
                </p>
                <p className="mt-1 font-display text-3xl font-bold tabular-nums text-ink-900">
                  {summary.conversionRate.toFixed(1)}%
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  {summary.orders} замовлень з {summary.qrSessions} QR-сесій
                </p>
              </div>
              <div className="rounded-lg border border-ink-100 bg-surface p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">
                  Середній чек
                </p>
                <p className="mt-1 font-display text-3xl font-bold tabular-nums text-ink-900">
                  {formatPrice(summary.averageOrderValue)}
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  за {summary.orders} {summary.orders === 1 ? "замовлення" : "замовлень"} сьогодні
                </p>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
              {METRIC_CARDS.map((metric) => (
                <div
                  key={metric.key}
                  className="rounded-lg border border-ink-100 bg-surface p-4"
                >
                  <p className="text-xs font-medium text-ink-500">{metric.label}</p>
                  <p className="mt-1 font-display text-2xl font-bold tabular-nums text-ink-900">
                    {summary[metric.key]}
                  </p>
                </div>
              ))}
            </section>

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {RANKING_LISTS.map((list) => (
                <RankedList
                  key={list.key}
                  title={list.title}
                  rows={summary[list.key]}
                  emptyHint={list.emptyHint}
                />
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
