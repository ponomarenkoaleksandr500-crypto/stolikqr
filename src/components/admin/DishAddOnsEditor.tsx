"use client";

import { useState } from "react";
import {
  ApiUnauthorizedError,
  addIngredient,
  addModifierChoice,
  addModifierGroup,
  removeIngredient,
  removeModifierChoice,
  removeModifierGroup,
  updateIngredient,
  updateModifierGroup,
} from "@/lib/api";
import { getStaffToken } from "@/lib/staffAuth";
import { IngredientGlyph } from "@/components/ingredientIcons";
import { PlusIcon, TrashIcon } from "@/components/icons";
import type { Dish, IngredientIcon } from "@/types/menu";

const ICON_OPTIONS: IngredientIcon[] = [
  "generic",
  "bread",
  "tomato",
  "garlic",
  "basil",
  "oliveOil",
  "meat",
  "cheese",
  "mushroom",
  "onion",
  "pepper",
  "fish",
  "seafood",
  "egg",
  "pasta",
];

/**
 * Ingredients ("components") + modifier groups/choices editor, embedded in the
 * dish editor page (see DishEditorForm). Every mutation call returns the full
 * updated Dish - we just swap it into the parent's state, no local merging.
 */
export function DishAddOnsEditor({
  dish,
  onChange,
  onUnauthorized,
}: {
  dish: Dish;
  onChange: (dish: Dish) => void;
  onUnauthorized: () => void;
}) {
  const handleError = (err: unknown) => {
    if (err instanceof ApiUnauthorizedError) onUnauthorized();
    else console.error(err);
  };

  return (
    <div className="flex flex-col gap-5">
      <IngredientsSection dish={dish} onChange={onChange} onError={handleError} />
      <ModifiersSection dish={dish} onChange={onChange} onError={handleError} />
    </div>
  );
}

function IngredientsSection({
  dish,
  onChange,
  onError,
}: {
  dish: Dish;
  onChange: (dish: Dish) => void;
  onError: (err: unknown) => void;
}) {
  const [nameUk, setNameUk] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [icon, setIcon] = useState<IngredientIcon>("generic");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    const token = getStaffToken();
    if (!token || !nameUk.trim() || !nameEn.trim() || isAdding) return;
    setIsAdding(true);
    try {
      const updated = await addIngredient(
        dish.id,
        { name: { uk: nameUk.trim(), en: nameEn.trim() }, icon, removable: true },
        token,
      );
      onChange(updated);
      setNameUk("");
      setNameEn("");
      setIcon("generic");
    } catch (err) {
      onError(err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleRemovable = async (ingredientId: string, removable: boolean) => {
    const token = getStaffToken();
    if (!token) return;
    try {
      const updated = await updateIngredient(dish.id, ingredientId, { removable }, token);
      onChange(updated);
    } catch (err) {
      onError(err);
    }
  };

  const handleRemove = async (ingredientId: string) => {
    const token = getStaffToken();
    if (!token) return;
    try {
      const updated = await removeIngredient(dish.id, ingredientId, token);
      onChange(updated);
    } catch (err) {
      onError(err);
    }
  };

  return (
    <section className="rounded-lg border border-ink-100 bg-surface p-5">
      <h2 className="font-display text-base font-semibold text-ink-900">Інгредієнти</h2>
      <p className="mt-1 text-xs text-ink-600">
        «Незамінний» інгредієнт гість бачить, але не може виключити із замовлення.
      </p>

      <ul className="mt-3 flex flex-col divide-y divide-ink-100">
        {dish.ingredients.map((ingredient) => (
          <li key={ingredient.id} className="flex items-center gap-3 py-2.5">
            <IngredientGlyph icon={ingredient.icon} className="h-4 w-4 shrink-0 text-accent-600" />
            <span className="flex-1 text-sm text-ink-800">{ingredient.name.uk}</span>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-600">
              <input
                type="checkbox"
                checked={!ingredient.removable}
                onChange={(e) => void handleToggleRemovable(ingredient.id, !e.target.checked)}
                className="h-3.5 w-3.5 cursor-pointer accent-accent-600"
              />
              Незамінний
            </label>
            <button
              type="button"
              onClick={() => void handleRemove(ingredient.id)}
              aria-label={`Видалити ${ingredient.name.uk}`}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-50 hover:text-danger-600"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {dish.ingredients.length === 0 && (
          <li className="py-2.5 text-sm text-ink-600">Ще немає інгредієнтів</li>
        )}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
        <input
          value={nameUk}
          onChange={(e) => setNameUk(e.target.value)}
          placeholder="Назва (укр)"
          className="h-10 min-w-0 flex-1 rounded-md border border-ink-400 bg-paper px-3 text-sm text-ink-900 placeholder:text-ink-500 outline-none focus:border-accent-500"
        />
        <input
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          placeholder="Name (en)"
          className="h-10 min-w-0 flex-1 rounded-md border border-ink-400 bg-paper px-3 text-sm text-ink-900 placeholder:text-ink-500 outline-none focus:border-accent-500"
        />
        <select
          value={icon}
          onChange={(e) => setIcon(e.target.value as IngredientIcon)}
          className="h-10 rounded-md border border-ink-400 bg-paper px-2 text-sm text-ink-900 placeholder:text-ink-500 outline-none focus:border-accent-500"
        >
          {ICON_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={isAdding || !nameUk.trim() || !nameEn.trim()}
          onClick={() => void handleAdd()}
          className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-ink-950 px-4 text-xs font-semibold text-paper transition-colors hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Додати
        </button>
      </div>
    </section>
  );
}

function ModifiersSection({
  dish,
  onChange,
  onError,
}: {
  dish: Dish;
  onChange: (dish: Dish) => void;
  onError: (err: unknown) => void;
}) {
  const [groupNameUk, setGroupNameUk] = useState("");
  const [groupNameEn, setGroupNameEn] = useState("");
  const [groupRequired, setGroupRequired] = useState(false);
  const [groupMultiple, setGroupMultiple] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);

  const handleAddGroup = async () => {
    const token = getStaffToken();
    if (!token || !groupNameUk.trim() || !groupNameEn.trim() || isAddingGroup) return;
    setIsAddingGroup(true);
    try {
      const updated = await addModifierGroup(
        dish.id,
        {
          name: { uk: groupNameUk.trim(), en: groupNameEn.trim() },
          required: groupRequired,
          multiple: groupMultiple,
        },
        token,
      );
      onChange(updated);
      setGroupNameUk("");
      setGroupNameEn("");
      setGroupRequired(false);
      setGroupMultiple(false);
    } catch (err) {
      onError(err);
    } finally {
      setIsAddingGroup(false);
    }
  };

  const handleToggleGroupFlag = async (
    groupId: string,
    patch: { required?: boolean; multiple?: boolean },
  ) => {
    const token = getStaffToken();
    if (!token) return;
    try {
      const updated = await updateModifierGroup(dish.id, groupId, patch, token);
      onChange(updated);
    } catch (err) {
      onError(err);
    }
  };

  const handleRemoveGroup = async (groupId: string) => {
    const token = getStaffToken();
    if (!token) return;
    try {
      const updated = await removeModifierGroup(dish.id, groupId, token);
      onChange(updated);
    } catch (err) {
      onError(err);
    }
  };

  const handleAddChoice = async (
    groupId: string,
    input: { nameUk: string; nameEn: string; priceDelta: number; exclusive: boolean },
  ) => {
    const token = getStaffToken();
    if (!token) return;
    try {
      const updated = await addModifierChoice(
        groupId,
        {
          name: { uk: input.nameUk, en: input.nameEn },
          priceDelta: input.priceDelta,
          exclusive: input.exclusive,
        },
        token,
      );
      onChange(updated);
    } catch (err) {
      onError(err);
    }
  };

  const handleRemoveChoice = async (groupId: string, choiceId: string) => {
    const token = getStaffToken();
    if (!token) return;
    try {
      const updated = await removeModifierChoice(groupId, choiceId, token);
      onChange(updated);
    } catch (err) {
      onError(err);
    }
  };

  return (
    <section className="rounded-lg border border-ink-100 bg-surface p-5">
      <h2 className="font-display text-base font-semibold text-ink-900">Модифікатори</h2>
      <p className="mt-1 text-xs text-ink-600">
        Групи платних/обов&apos;язкових опцій, наприклад «Гострота» або «Соус».
      </p>

      <div className="mt-3 flex flex-col gap-4">
        {(dish.optionGroups ?? []).map((group) => (
          <div key={group.id} className="rounded-md border border-ink-100 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink-900">{group.name.uk}</span>
              <button
                type="button"
                onClick={() => void handleRemoveGroup(group.id)}
                aria-label={`Видалити групу ${group.name.uk}`}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-50 hover:text-danger-600"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4">
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-600">
                <input
                  type="checkbox"
                  checked={group.required}
                  onChange={(e) => void handleToggleGroupFlag(group.id, { required: e.target.checked })}
                  className="h-3.5 w-3.5 cursor-pointer accent-accent-600"
                />
                Обов&apos;язково
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-600">
                <input
                  type="checkbox"
                  checked={group.multiple}
                  onChange={(e) => void handleToggleGroupFlag(group.id, { multiple: e.target.checked })}
                  className="h-3.5 w-3.5 cursor-pointer accent-accent-600"
                />
                Декілька варіантів
              </label>
            </div>

            <ul className="mt-2 flex flex-col divide-y divide-ink-100">
              {group.choices.map((choice) => (
                <li key={choice.id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="flex-1 text-ink-800">{choice.name.uk}</span>
                  {choice.priceDelta > 0 && (
                    <span className="tabular-nums text-ink-600">+{choice.priceDelta} ₴</span>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleRemoveChoice(group.id, choice.id)}
                    aria-label={`Видалити ${choice.name.uk}`}
                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-50 hover:text-danger-600"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </li>
              ))}
              {group.choices.length === 0 && (
                <li className="py-2 text-xs text-ink-600">Ще немає варіантів</li>
              )}
            </ul>

            <ChoiceForm onAdd={(input) => void handleAddChoice(group.id, input)} />
          </div>
        ))}
        {(dish.optionGroups ?? []).length === 0 && (
          <p className="text-sm text-ink-600">Ще немає груп модифікаторів</p>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-ink-100 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={groupNameUk}
            onChange={(e) => setGroupNameUk(e.target.value)}
            placeholder="Назва групи (укр)"
            className="h-10 min-w-0 flex-1 rounded-md border border-ink-400 bg-paper px-3 text-sm text-ink-900 placeholder:text-ink-500 outline-none focus:border-accent-500"
          />
          <input
            value={groupNameEn}
            onChange={(e) => setGroupNameEn(e.target.value)}
            placeholder="Group name (en)"
            className="h-10 min-w-0 flex-1 rounded-md border border-ink-400 bg-paper px-3 text-sm text-ink-900 placeholder:text-ink-500 outline-none focus:border-accent-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-600">
            <input
              type="checkbox"
              checked={groupRequired}
              onChange={(e) => setGroupRequired(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-accent-600"
            />
            Обов&apos;язково
          </label>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-600">
            <input
              type="checkbox"
              checked={groupMultiple}
              onChange={(e) => setGroupMultiple(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-accent-600"
            />
            Декілька варіантів
          </label>
          <button
            type="button"
            disabled={isAddingGroup || !groupNameUk.trim() || !groupNameEn.trim()}
            onClick={() => void handleAddGroup()}
            className="ml-auto flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-ink-950 px-4 text-xs font-semibold text-paper transition-colors hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Додати групу
          </button>
        </div>
      </div>
    </section>
  );
}

function ChoiceForm({
  onAdd,
}: {
  onAdd: (input: { nameUk: string; nameEn: string; priceDelta: number; exclusive: boolean }) => void;
}) {
  const [nameUk, setNameUk] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [priceDelta, setPriceDelta] = useState("0");
  const [exclusive, setExclusive] = useState(false);

  const handleAdd = () => {
    if (!nameUk.trim() || !nameEn.trim()) return;
    onAdd({
      nameUk: nameUk.trim(),
      nameEn: nameEn.trim(),
      priceDelta: Number(priceDelta) || 0,
      exclusive,
    });
    setNameUk("");
    setNameEn("");
    setPriceDelta("0");
    setExclusive(false);
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-2">
      <input
        value={nameUk}
        onChange={(e) => setNameUk(e.target.value)}
        placeholder="Варіант (укр)"
        className="h-9 min-w-0 flex-1 rounded-sm border border-ink-400 bg-paper px-2.5 text-xs text-ink-900 placeholder:text-ink-500 outline-none focus:border-accent-500"
      />
      <input
        value={nameEn}
        onChange={(e) => setNameEn(e.target.value)}
        placeholder="Choice (en)"
        className="h-9 min-w-0 flex-1 rounded-sm border border-ink-400 bg-paper px-2.5 text-xs text-ink-900 placeholder:text-ink-500 outline-none focus:border-accent-500"
      />
      <input
        type="number"
        min={0}
        step="0.01"
        value={priceDelta}
        onChange={(e) => setPriceDelta(e.target.value)}
        placeholder="+₴"
        className="h-9 w-16 rounded-sm border border-ink-400 bg-paper px-2 text-xs text-ink-900 placeholder:text-ink-500 outline-none focus:border-accent-500"
      />
      <label className="flex cursor-pointer items-center gap-1 text-[11px] text-ink-600">
        <input
          type="checkbox"
          checked={exclusive}
          onChange={(e) => setExclusive(e.target.checked)}
          className="h-3 w-3 cursor-pointer accent-accent-600"
        />
        Виключний
      </label>
      <button
        type="button"
        disabled={!nameUk.trim() || !nameEn.trim()}
        onClick={handleAdd}
        className="flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-ink-200 px-3 text-[11px] font-semibold text-ink-600 transition-colors hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <PlusIcon className="h-3 w-3" />
        Додати
      </button>
    </div>
  );
}
