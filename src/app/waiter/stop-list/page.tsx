"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ApiUnauthorizedError,
  fetchStaffDishList,
  updateDishAvailability,
  type StaffDishResponse,
} from "@/lib/api";
import { clearStaffSession, getStaffToken, getStoredStaff } from "@/lib/staffAuth";

// Demo Platform v1 is single-tenant - see stolikqr/src/app/page.tsx for the
// same constant used on the Guest App side.
const DEMO_RESTAURANT_SLUG = "demo-restaurant";

/** Groups the flat staff dish list into category sections, preserving backend order. */
function groupByCategory(dishes: StaffDishResponse[]): { categoryName: string; dishes: StaffDishResponse[] }[] {
  const groups: { categoryName: string; dishes: StaffDishResponse[] }[] = [];
  for (const dish of dishes) {
    const label = dish.categoryName.uk;
    const last = groups[groups.length - 1];
    if (last && last.categoryName === label) last.dishes.push(dish);
    else groups.push({ categoryName: label, dishes: [dish] });
  }
  return groups;
}

export default function StopListPage() {
  const router = useRouter();
  const [dishes, setDishes] = useState<StaffDishResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

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
      const data = await fetchStaffDishList(DEMO_RESTAURANT_SLUG, token);
      setDishes(data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) {
        goToLogin();
        return;
      }
      setError("Не вдалося завантажити страви. Перевірте з'єднання.");
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount, refresh is stable via useCallback
  }, []);

  const toggle = async (dish: StaffDishResponse) => {
    const token = getStaffToken();
    if (!token || pendingId) return;
    setPendingId(dish.id);
    // Optimistic flip - reconciled by the real response, reverted on failure.
    setDishes((prev) =>
      prev?.map((d) => (d.id === dish.id ? { ...d, isAvailable: !d.isAvailable } : d)) ?? prev,
    );
    try {
      const updated = await updateDishAvailability(dish.id, !dish.isAvailable, token);
      setDishes((prev) => prev?.map((d) => (d.id === updated.id ? updated : d)) ?? prev);
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) {
        goToLogin();
        return;
      }
      setDishes((prev) =>
        prev?.map((d) => (d.id === dish.id ? { ...d, isAvailable: dish.isAvailable } : d)) ?? prev,
      );
      console.error(err);
    } finally {
      setPendingId(null);
    }
  };

  const groups = dishes ? groupByCategory(dishes) : [];
  const stoppedCount = dishes?.filter((d) => !d.isAvailable).length ?? 0;

  return (
    <div className="min-h-dvh bg-paper pb-16">
      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-ink-100 bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg font-semibold text-ink-900">Стоп-лист</p>
          <p className="text-xs text-ink-600">
            {dishes ? `Немає в наявності: ${stoppedCount}` : "…"}
          </p>
        </div>
        <Link
          href="/waiter"
          className="flex h-11 w-full items-center justify-center rounded-full border border-ink-200 px-4 text-xs font-semibold text-ink-600 transition-colors hover:bg-ink-50 sm:w-auto"
        >
          До панелі
        </Link>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-5">
        {error && (
          <div className="rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-700">
            {error}
          </div>
        )}

        {!dishes && !error && <p className="text-sm text-ink-600">Завантаження…</p>}

        {groups.map((group) => (
          <section key={group.categoryName}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-600">
              {group.categoryName}
            </h2>
            <div className="mt-2 flex flex-col gap-2">
              {group.dishes.map((dish) => (
                <button
                  key={dish.id}
                  type="button"
                  disabled={pendingId === dish.id}
                  onClick={() => void toggle(dish)}
                  className={`flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                    dish.isAvailable
                      ? "border-ink-100 bg-surface"
                      : "border-accent-200 bg-accent-50"
                  }`}
                >
                  <span
                    className={`text-sm font-medium ${
                      dish.isAvailable ? "text-ink-900" : "text-accent-700 line-through decoration-2"
                    }`}
                  >
                    {dish.name.uk}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                      dish.isAvailable ? "bg-ink-200" : "bg-accent-500"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-surface shadow transition-transform ${
                        dish.isAvailable ? "left-0.5" : "left-[1.375rem]"
                      }`}
                    />
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
