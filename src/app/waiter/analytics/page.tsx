"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ApiUnauthorizedError,
  fetchStaffAnalytics,
  type StaffAnalyticsSummaryResponse,
} from "@/lib/api";
import { clearStaffSession, getStaffToken, getStoredStaff } from "@/lib/staffAuth";

// Demo Platform v1 is single-tenant - see stolikqr/src/app/page.tsx for the
// same constant used on the Guest App side.
const DEMO_RESTAURANT_SLUG = "demo-restaurant";

const METRIC_CARDS: { key: keyof StaffAnalyticsSummaryResponse; label: string }[] = [
  { key: "qrSessions", label: "QR-сесії" },
  { key: "menuViews", label: "Відкриття меню" },
  { key: "categoryViews", label: "Перегляди категорій" },
  { key: "dishViews", label: "Перегляди страв" },
  { key: "addToCart", label: "Додано в кошик" },
  { key: "orders", label: "Замовлення" },
  { key: "waiterCalls", label: "Виклики офіціанта" },
];

export default function StaffAnalyticsPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<StaffAnalyticsSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const data = await fetchStaffAnalytics(DEMO_RESTAURANT_SLUG, token);
      setSummary(data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) {
        goToLogin();
        return;
      }
      setError("Не вдалося завантажити аналітику. Перевірте з'єднання.");
      console.error(err);
    }
  }, [goToLogin]);

  useEffect(() => {
    const staff = getStoredStaff();
    const token = getStaffToken();
    if (!staff || !token) {
      goToLogin();
      return;
    }
    // One-time initial fetch on mount, same justified pattern as the Waiter
    // dashboard's own auth-gated refresh (see src/app/waiter/page.tsx) - the
    // setState calls only happen after refresh()'s internal `await`, not
    // synchronously within this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount, refresh is stable via useCallback
  }, []);

  return (
    <div className="min-h-screen bg-paper pb-16">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-100 bg-surface px-5 py-4">
        <div>
          <p className="font-display text-lg font-semibold text-ink-900">Аналітика</p>
          <p className="text-xs text-ink-500">Сьогодні</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/waiter"
            className="flex h-9 items-center rounded-full border border-ink-200 px-4 text-xs font-semibold text-ink-600 transition-colors hover:bg-ink-50"
          >
            До панелі
          </Link>
          <button
            type="button"
            onClick={() => void refresh()}
            className="flex h-9 items-center rounded-full bg-ink-950 px-4 text-xs font-semibold text-paper transition-colors hover:bg-ink-800"
          >
            Оновити
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-5">
        {error && (
          <div className="rounded-2xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-700">
            {error}
          </div>
        )}

        {!summary && !error && <p className="text-sm text-ink-400">Завантаження…</p>}

        {summary && (
          <>
            <section className="rounded-2xl border border-ink-100 bg-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Конверсія в замовлення
              </p>
              <p className="mt-1 font-display text-3xl font-bold tabular-nums text-ink-900">
                {summary.conversionRate.toFixed(1)}%
              </p>
              <p className="mt-1 text-xs text-ink-500">
                {summary.orders} замовлень з {summary.qrSessions} QR-сесій
              </p>
            </section>

            <section className="grid grid-cols-2 gap-3">
              {METRIC_CARDS.map((metric) => (
                <div
                  key={metric.key}
                  className="rounded-2xl border border-ink-100 bg-surface p-4"
                >
                  <p className="text-xs font-medium text-ink-500">{metric.label}</p>
                  <p className="mt-1 font-display text-2xl font-bold tabular-nums text-ink-900">
                    {summary[metric.key]}
                  </p>
                </div>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
