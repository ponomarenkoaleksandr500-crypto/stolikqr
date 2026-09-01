"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ApiUnauthorizedError, deleteDishPhoto, uploadDishPhoto } from "@/lib/api";
import { getStaffToken } from "@/lib/staffAuth";
import { PlateIcon, TrashIcon } from "@/components/icons";
import type { Dish } from "@/types/menu";

export function DishPhotoUploader({
  dish,
  onChange,
  onUnauthorized,
}: {
  dish: Dish;
  onChange: (dish: Dish) => void;
  onUnauthorized: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = async (file: File) => {
    const token = getStaffToken();
    if (!token) return;
    setIsUploading(true);
    setError(null);
    try {
      const updated = await uploadDishPhoto(dish.id, file, token);
      onChange(updated);
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) onUnauthorized();
      else setError(err instanceof Error ? err.message : "Не вдалося завантажити фото");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    const token = getStaffToken();
    if (!token) return;
    try {
      const updated = await deleteDishPhoto(dish.id, token);
      onChange(updated);
    } catch (err) {
      if (err instanceof ApiUnauthorizedError) onUnauthorized();
      else setError(err instanceof Error ? err.message : "Не вдалося видалити фото");
    }
  };

  return (
    <section className="rounded-lg border border-ink-100 bg-surface p-5">
      <h2 className="font-display text-base font-semibold text-ink-900">Фото страви</h2>
      <p className="mt-1 text-xs text-ink-600">
        Фото показується на картці страви та в меню гостя. Без фото страва
        показується нейтральною заглушкою.
      </p>

      {error && (
        <div className="mt-3 rounded-md border border-accent-200 bg-accent-50 px-3 py-2 text-sm text-accent-700">
          {error}
        </div>
      )}

      <div className="mt-3 flex items-center gap-4">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-ink-50">
          {dish.photoUrl ? (
            <Image src={dish.photoUrl} alt="" fill sizes="96px" className="object-cover object-bottom" />
          ) : (
            <PlateIcon className="h-7 w-7 text-ink-300" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileSelected(file);
            }}
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 cursor-pointer items-center justify-center rounded-full border border-ink-200 px-4 text-xs font-semibold text-ink-700 transition-colors hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUploading ? "Завантаження…" : dish.photoUrl ? "Замінити фото" : "Завантажити фото"}
          </button>
          {dish.photoUrl && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-ink-200 px-4 text-xs font-semibold text-ink-500 transition-colors hover:bg-ink-50 hover:text-danger-600"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Видалити фото
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
