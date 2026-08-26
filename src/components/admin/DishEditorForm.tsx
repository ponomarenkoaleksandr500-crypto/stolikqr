"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ApiUnauthorizedError,
  createDish,
  deleteDish,
  fetchAdminCategories,
  fetchAdminDish,
  updateDish,
  updateDishAvailability,
  type AdminCategoryResponse,
  type CreateDishInput,
} from "@/lib/api";
import { getStaffToken } from "@/lib/staffAuth";
import { useAdminSession } from "@/lib/useAdminSession";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DishAddOnsEditor } from "@/components/admin/DishAddOnsEditor";
import { DishPhotoUploader } from "@/components/admin/DishPhotoUploader";
import { TrashIcon, CheckIcon } from "@/components/icons";
import type { Dish } from "@/types/menu";

// Every gradient here also exists on a real seed dish (backend/prisma/seed.ts)
// so a picked swatch is guaranteed to already render correctly on DishCard/DishModal.
const GRADIENT_PRESETS = [
  "from-red-400 to-orange-600",
  "from-amber-600 to-red-700",
  "from-amber-300 to-yellow-500",
  "from-yellow-200 to-amber-400",
  "from-lime-300 to-green-500",
  "from-rose-300 to-red-500",
  "from-yellow-300 to-amber-600",
  "from-orange-400 to-amber-700",
  "from-sky-300 to-blue-500",
  "from-teal-300 to-emerald-600",
  "from-violet-300 to-purple-600",
  "from-pink-300 to-rose-500",
];

const CONFIRM_DELETE_TIMEOUT_MS = 4_000;

interface FormState {
  nameUk: string;
  nameEn: string;
  descriptionUk: string;
  descriptionEn: string;
  price: string;
  categoryId: string;
  emoji: string;
  gradient: string;
  featured: boolean;
}

const EMPTY_FORM: FormState = {
  nameUk: "",
  nameEn: "",
  descriptionUk: "",
  descriptionEn: "",
  price: "",
  categoryId: "",
  emoji: "🍽️",
  gradient: GRADIENT_PRESETS[0],
  featured: false,
};

function dishToForm(dish: Dish): FormState {
  return {
    nameUk: dish.name.uk,
    nameEn: dish.name.en,
    descriptionUk: dish.description?.uk ?? "",
    descriptionEn: dish.description?.en ?? "",
    price: String(dish.price),
    categoryId: dish.categoryId,
    emoji: dish.emoji,
    gradient: dish.gradient,
    featured: Boolean(dish.featured),
  };
}

export function DishEditorForm({
  mode,
  dishId,
  initialCategoryId,
}: {
  mode: "create" | "edit";
  dishId?: string;
  initialCategoryId?: string;
}) {
  const { staff, restaurantName, logout } = useAdminSession();
  const router = useRouter();

  const [categories, setCategories] = useState<AdminCategoryResponse[] | null>(null);
  const [form, setForm] = useState<FormState>({
    ...EMPTY_FORM,
    categoryId: initialCategoryId ?? "",
  });
  const [dish, setDish] = useState<Dish | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!staff) return;
    const token = getStaffToken();
    if (!token) return;

    let cancelled = false;
    void (async () => {
      try {
        const cats = await fetchAdminCategories("demo-restaurant", token);
        if (cancelled) return;
        setCategories(cats);

        if (mode === "edit" && dishId) {
          const loadedDish = await fetchAdminDish(dishId, token);
          if (cancelled) return;
          setForm(dishToForm(loadedDish));
          setIsAvailable(loadedDish.isAvailable);
          setDish(loadedDish);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiUnauthorizedError) {
          logout();
          return;
        }
        setError("Не вдалося завантажити дані страви.");
        console.error(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount for the given mode/dishId, logout is stable
  }, [staff, mode, dishId]);

  const buildPayload = (): CreateDishInput | null => {
    const price = Number(form.price);
    if (!form.nameUk.trim() || !form.nameEn.trim() || !form.categoryId || !Number.isFinite(price) || price <= 0) {
      setError("Заповніть назву (укр/en), категорію та коректну ціну.");
      return null;
    }
    const descriptionUk = form.descriptionUk.trim();
    const descriptionEn = form.descriptionEn.trim();
    return {
      name: { uk: form.nameUk.trim(), en: form.nameEn.trim() },
      // The backend rejects a description with an empty uk/en (@IsNotEmpty on
      // LocalizedTextDto) - omit the field entirely rather than send blanks,
      // so a dish with no description saves cleanly instead of 400ing.
      ...(descriptionUk && descriptionEn
        ? { description: { uk: descriptionUk, en: descriptionEn } }
        : {}),
      price,
      categoryId: form.categoryId,
      emoji: form.emoji.trim() || "🍽️",
      gradient: form.gradient,
      featured: form.featured,
    };
  };

  const handleSave = async () => {
    const token = getStaffToken();
    if (!token || isSaving) return;
    const payload = buildPayload();
    if (!payload) return;

    setIsSaving(true);
    setError(null);
    try {
      if (mode === "create") {
        const dish = await createDish(payload, token);
        router.push(`/admin/menu/dishes/${dish.id}`);
      } else if (dishId) {
        await updateDish(dishId, payload, token);
        router.push("/admin/menu");
      }
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) {
        logout();
        return;
      }
      setError(err instanceof Error ? err.message : "Не вдалося зберегти страву.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleAvailability = async () => {
    const token = getStaffToken();
    if (!token || !dishId) return;
    const next = !isAvailable;
    setIsAvailable(next);
    try {
      await updateDishAvailability(dishId, next, token);
    } catch (err) {
      setIsAvailable(!next);
      if (err instanceof ApiUnauthorizedError) logout();
      else console.error(err);
    }
  };

  const handleDeleteClick = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      window.setTimeout(() => setConfirmingDelete(false), CONFIRM_DELETE_TIMEOUT_MS);
      return;
    }
    void handleDelete();
  };

  const handleDelete = async () => {
    const token = getStaffToken();
    if (!token || !dishId) return;
    setConfirmingDelete(false);
    try {
      await deleteDish(dishId, token);
      router.push("/admin/menu");
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) logout();
      else setError(err instanceof Error ? err.message : "Не вдалося видалити страву.");
    }
  };

  if (!staff) return null;

  return (
    <div className="min-h-screen bg-paper pb-16">
      <AdminHeader restaurantName={restaurantName} staffName={staff.name} onLogout={logout} />

      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-5 py-5">
        <div className="flex items-center justify-between">
          <Link href="/admin/menu" className="text-sm font-semibold text-ink-600 hover:text-accent-600">
            ← До меню
          </Link>
          {mode === "edit" && (
            <button
              type="button"
              onClick={handleDeleteClick}
              className={`flex h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${
                confirmingDelete
                  ? "border-red-300 bg-red-50 text-red-700"
                  : "border-ink-200 text-ink-500 hover:bg-ink-50"
              }`}
            >
              <TrashIcon className="h-3.5 w-3.5" />
              {confirmingDelete ? "Підтвердити видалення?" : "Видалити страву"}
            </button>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-ink-600">Завантаження…</p>
        ) : (
          <div className="flex flex-col gap-4 rounded-2xl border border-ink-100 bg-surface p-5">
            {error && (
              <div className="rounded-xl border border-accent-200 bg-accent-50 px-3 py-2 text-sm text-accent-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Назва (укр)">
                <input
                  value={form.nameUk}
                  onChange={(e) => setForm((f) => ({ ...f, nameUk: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-ink-200 bg-paper px-3 text-sm text-ink-900 outline-none focus:border-accent-500"
                />
              </Field>
              <Field label="Name (en)">
                <input
                  value={form.nameEn}
                  onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-ink-200 bg-paper px-3 text-sm text-ink-900 outline-none focus:border-accent-500"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Опис (укр)">
                <textarea
                  value={form.descriptionUk}
                  onChange={(e) => setForm((f) => ({ ...f, descriptionUk: e.target.value }))}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-ink-200 bg-paper px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent-500"
                />
              </Field>
              <Field label="Description (en)">
                <textarea
                  value={form.descriptionEn}
                  onChange={(e) => setForm((f) => ({ ...f, descriptionEn: e.target.value }))}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-ink-200 bg-paper px-3 py-2 text-sm text-ink-900 outline-none focus:border-accent-500"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Ціна, грн">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-ink-200 bg-paper px-3 text-sm text-ink-900 outline-none focus:border-accent-500"
                />
              </Field>
              <Field label="Категорія">
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-ink-200 bg-paper px-3 text-sm text-ink-900 outline-none focus:border-accent-500"
                >
                  <option value="" disabled>
                    Оберіть…
                  </option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name.uk}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Емодзі (заглушка фото)">
              <input
                value={form.emoji}
                onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                className="h-11 w-24 rounded-xl border border-ink-200 bg-paper px-3 text-center text-lg outline-none focus:border-accent-500"
              />
            </Field>

            <Field label="Колір фону картки">
              <div className="flex flex-wrap gap-2">
                {GRADIENT_PRESETS.map((gradient) => (
                  <button
                    key={gradient}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, gradient }))}
                    aria-label={gradient}
                    className={`h-10 w-10 shrink-0 cursor-pointer rounded-full bg-gradient-to-br ${gradient} transition-transform ${
                      form.gradient === gradient ? "ring-2 ring-ink-950 ring-offset-2 ring-offset-surface" : ""
                    }`}
                  />
                ))}
              </div>
            </Field>

            <div className="flex flex-wrap items-center gap-4 border-t border-ink-100 pt-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                  className="h-4 w-4 cursor-pointer accent-accent-600"
                />
                Рекомендована страва
              </label>

              {mode === "edit" && (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={() => void handleToggleAvailability()}
                    className="h-4 w-4 cursor-pointer accent-accent-600"
                  />
                  Доступна для замовлення
                </label>
              )}
            </div>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleSave()}
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent-600 text-sm font-semibold text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <CheckIcon className="h-4 w-4" />
              {isSaving ? "Збереження…" : "Зберегти"}
            </button>
          </div>
        )}

        {mode === "edit" && dish && (
          <>
            <DishPhotoUploader dish={dish} onChange={setDish} onUnauthorized={logout} />
            <DishAddOnsEditor dish={dish} onChange={setDish} onUnauthorized={logout} />
          </>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-600">
      {label}
      {children}
    </label>
  );
}
