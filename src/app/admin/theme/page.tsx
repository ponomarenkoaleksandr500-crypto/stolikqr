"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiUnauthorizedError, fetchMenuByRestaurantSlug, updateTheme } from "@/lib/api";
import { getStaffToken } from "@/lib/staffAuth";
import { useAdminSession } from "@/lib/useAdminSession";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CheckIcon } from "@/components/icons";
import { THEME_OPTIONS } from "@/lib/themes";

const DEMO_RESTAURANT_SLUG = "demo-restaurant";

export default function AdminThemePage() {
  const { staff, restaurantName, logout } = useAdminSession();
  const [currentThemeKey, setCurrentThemeKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const menu = await fetchMenuByRestaurantSlug(DEMO_RESTAURANT_SLUG);
      setCurrentThemeKey(menu.restaurant.themeKey);
    } catch (err) {
      setError("Не вдалося завантажити поточну тему.");
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (!staff) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh()'s setState calls only happen after its internal await
    void refresh();
  }, [staff, refresh]);

  const handleSelect = async (themeKey: string) => {
    const token = getStaffToken();
    if (!token || savingKey || themeKey === currentThemeKey) return;
    setSavingKey(themeKey);
    setError(null);
    try {
      await updateTheme(themeKey, token);
      // A full reload is the simplest way to guarantee every already-mounted
      // layout (this page's own AdminLayout included) picks up the new
      // data-theme attribute in one shot, no cross-component state plumbing.
      window.location.reload();
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) logout();
      else setError(err instanceof Error ? err.message : "Не вдалося зберегти тему.");
      setSavingKey(null);
    }
  };

  if (!staff) return null;

  return (
    <div className="min-h-screen bg-paper pb-16">
      <AdminHeader restaurantName={restaurantName} staffName={staff.name} onLogout={logout} />

      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-5">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink-900">Колірна тема</h1>
          <p className="mt-1 text-sm text-ink-600">
            Одна тема діє одразу на гостьовому меню, панелі офіціанта та адмін-панелі.
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {THEME_OPTIONS.map((theme) => {
            const isActive = theme.key === currentThemeKey;
            const isSaving = savingKey === theme.key;
            return (
              <button
                key={theme.key}
                type="button"
                disabled={savingKey !== null}
                onClick={() => void handleSelect(theme.key)}
                className={`flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed ${
                  isActive
                    ? "border-ink-950 bg-surface"
                    : "border-ink-100 bg-surface hover:border-accent-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <span
                      className="h-8 w-8 rounded-full border border-ink-100"
                      style={{ backgroundColor: theme.swatches.paper }}
                    />
                    <span
                      className="h-8 w-8 rounded-full border border-ink-100"
                      style={{ backgroundColor: theme.swatches.accent }}
                    />
                    <span
                      className="h-8 w-8 rounded-full border border-ink-100"
                      style={{ backgroundColor: theme.swatches.sage }}
                    />
                  </div>
                  {isActive && (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-950 text-paper">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-display text-base font-semibold text-ink-900">{theme.label}</p>
                  <p className="mt-0.5 text-xs text-ink-600">{theme.description}</p>
                </div>
                {isSaving && <p className="text-xs font-semibold text-accent-600">Застосування…</p>}
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
