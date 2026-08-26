"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ApiUnauthorizedError,
  createCategory,
  deleteCategory,
  fetchAdminCategories,
  fetchAdminDishes,
  renameCategory,
  type AdminCategoryResponse,
  type AdminDishSummaryResponse,
} from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { getStaffToken } from "@/lib/staffAuth";
import { useAdminSession } from "@/lib/useAdminSession";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { PlusIcon, CheckIcon, CloseIcon, TrashIcon } from "@/components/icons";

// Demo Platform v1 is single-tenant - see stolikqr/src/app/page.tsx for the
// same constant used on the Guest App side.
const DEMO_RESTAURANT_SLUG = "demo-restaurant";

// A category delete button's second click within this window confirms it -
// same pattern as the Waiter App's "close table" (see src/app/waiter/page.tsx).
const CONFIRM_DELETE_TIMEOUT_MS = 4_000;

export default function AdminMenuPage() {
  const { staff, restaurantName, logout } = useAdminSession();
  const [categories, setCategories] = useState<AdminCategoryResponse[] | null>(null);
  const [dishes, setDishes] = useState<AdminDishSummaryResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newCategoryUk, setNewCategoryUk] = useState("");
  const [newCategoryEn, setNewCategoryEn] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editName, setEditName] = useState({ uk: "", en: "" });

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmDeleteTimeoutRef = useRef<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = getStaffToken();
    if (!token) {
      logout();
      return;
    }
    try {
      const [cats, dishList] = await Promise.all([
        fetchAdminCategories(DEMO_RESTAURANT_SLUG, token),
        fetchAdminDishes(DEMO_RESTAURANT_SLUG, token),
      ]);
      setCategories(cats);
      setDishes(dishList);
      setError(null);
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) {
        logout();
        return;
      }
      setError("Не вдалося завантажити меню. Перевірте з'єднання.");
      console.error(err);
    }
  }, [logout]);

  useEffect(() => {
    if (!staff) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh()'s setState calls only happen after its internal await
    void refresh();
  }, [staff, refresh]);

  useEffect(() => {
    return () => {
      if (confirmDeleteTimeoutRef.current) window.clearTimeout(confirmDeleteTimeoutRef.current);
    };
  }, []);

  const handleCreateCategory = async () => {
    const token = getStaffToken();
    if (!token || !newCategoryUk.trim() || !newCategoryEn.trim() || isCreatingCategory) return;
    setIsCreatingCategory(true);
    try {
      await createCategory(
        DEMO_RESTAURANT_SLUG,
        { uk: newCategoryUk.trim(), en: newCategoryEn.trim() },
        token,
      );
      setNewCategoryUk("");
      setNewCategoryEn("");
      void refresh();
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) logout();
      else console.error(err);
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const startEditing = (category: AdminCategoryResponse) => {
    setEditingCategoryId(category.id);
    setEditName({ uk: category.name.uk, en: category.name.en });
  };

  const saveEditing = async () => {
    const token = getStaffToken();
    if (!token || !editingCategoryId || !editName.uk.trim() || !editName.en.trim()) return;
    try {
      await renameCategory(
        editingCategoryId,
        { uk: editName.uk.trim(), en: editName.en.trim() },
        token,
      );
      setEditingCategoryId(null);
      void refresh();
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) logout();
      else console.error(err);
    }
  };

  const handleDeleteClick = (category: AdminCategoryResponse) => {
    if (confirmDeleteId !== category.id) {
      setDeleteError(null);
      setConfirmDeleteId(category.id);
      if (confirmDeleteTimeoutRef.current) window.clearTimeout(confirmDeleteTimeoutRef.current);
      confirmDeleteTimeoutRef.current = window.setTimeout(
        () => setConfirmDeleteId(null),
        CONFIRM_DELETE_TIMEOUT_MS,
      );
      return;
    }
    if (confirmDeleteTimeoutRef.current) window.clearTimeout(confirmDeleteTimeoutRef.current);
    setConfirmDeleteId(null);
    void confirmDelete(category);
  };

  const confirmDelete = async (category: AdminCategoryResponse) => {
    const token = getStaffToken();
    if (!token) return;
    try {
      await deleteCategory(category.id, token);
      void refresh();
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) logout();
      else setDeleteError(err instanceof Error ? err.message : "Не вдалося видалити категорію");
    }
  };

  if (!staff) return null;

  return (
    <div className="min-h-screen bg-paper pb-16">
      <AdminHeader restaurantName={restaurantName} staffName={staff.name} onLogout={logout} />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-5">
        {error && (
          <div className="rounded-2xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-700">
            {error}
          </div>
        )}
        {deleteError && (
          <div className="rounded-2xl border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-accent-700">
            {deleteError}
          </div>
        )}

        {!categories && !error && <p className="text-sm text-ink-600">Завантаження…</p>}

        {categories?.map((category) => {
          const categoryDishes = dishes?.filter((d) => d.categoryId === category.id) ?? [];
          const isEditing = editingCategoryId === category.id;
          const isConfirmingDelete = confirmDeleteId === category.id;
          return (
            <section key={category.id} className="rounded-2xl border border-ink-100 bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                {isEditing ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      value={editName.uk}
                      onChange={(e) => setEditName((n) => ({ ...n, uk: e.target.value }))}
                      placeholder="Назва (укр)"
                      className="h-10 min-w-0 flex-1 rounded-xl border border-ink-200 bg-paper px-3 text-sm text-ink-900 outline-none focus:border-accent-500"
                    />
                    <input
                      value={editName.en}
                      onChange={(e) => setEditName((n) => ({ ...n, en: e.target.value }))}
                      placeholder="Name (en)"
                      className="h-10 min-w-0 flex-1 rounded-xl border border-ink-200 bg-paper px-3 text-sm text-ink-900 outline-none focus:border-accent-500"
                    />
                    <button
                      type="button"
                      onClick={() => void saveEditing()}
                      aria-label="Зберегти"
                      className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-sage-600 text-white transition-colors hover:bg-sage-700"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCategoryId(null)}
                      aria-label="Скасувати"
                      className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-50"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => startEditing(category)}
                      className="cursor-pointer text-left font-display text-lg font-semibold text-ink-900 hover:text-accent-600"
                    >
                      {category.name.uk}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(category)}
                      title={isConfirmingDelete ? "Натисніть ще раз, щоб підтвердити" : "Видалити категорію"}
                      className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${
                        isConfirmingDelete
                          ? "border-red-300 bg-red-50 text-red-700"
                          : "border-ink-200 text-ink-500 hover:bg-ink-50"
                      }`}
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      {isConfirmingDelete ? "Підтвердити?" : "Видалити"}
                    </button>
                  </>
                )}
              </div>

              <ul className="mt-3 divide-y divide-ink-100">
                {categoryDishes.map((dish) => (
                  <li key={dish.id}>
                    <Link
                      href={`/admin/menu/dishes/${dish.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-accent-600"
                    >
                      <span className="flex items-center gap-2">
                        <span aria-hidden="true">{dish.emoji}</span>
                        <span className={dish.isAvailable ? "text-ink-800" : "text-ink-600 line-through"}>
                          {dish.name.uk}
                        </span>
                      </span>
                      <span className="tabular-nums text-ink-600">{formatPrice(dish.price)}</span>
                    </Link>
                  </li>
                ))}
                {categoryDishes.length === 0 && (
                  <li className="py-2.5 text-sm text-ink-600">Ще немає страв</li>
                )}
              </ul>

              <Link
                href={`/admin/menu/dishes/new?categoryId=${category.id}`}
                className="mt-3 flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-dashed border-ink-200 text-xs font-semibold text-ink-600 transition-colors hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Додати страву
              </Link>
            </section>
          );
        })}

        <section className="rounded-2xl border border-dashed border-ink-200 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-600">Нова категорія</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              value={newCategoryUk}
              onChange={(e) => setNewCategoryUk(e.target.value)}
              placeholder="Назва (укр)"
              className="h-11 min-w-0 flex-1 rounded-xl border border-ink-200 bg-paper px-3 text-sm text-ink-900 outline-none focus:border-accent-500"
            />
            <input
              value={newCategoryEn}
              onChange={(e) => setNewCategoryEn(e.target.value)}
              placeholder="Name (en)"
              className="h-11 min-w-0 flex-1 rounded-xl border border-ink-200 bg-paper px-3 text-sm text-ink-900 outline-none focus:border-accent-500"
            />
            <button
              type="button"
              disabled={isCreatingCategory || !newCategoryUk.trim() || !newCategoryEn.trim()}
              onClick={() => void handleCreateCategory()}
              className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-accent-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Додати
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
