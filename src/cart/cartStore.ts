import type { Locale } from "@/i18n/types";
import { computeDishPrice, describeSelections, selectionsKey, type Selections } from "@/lib/dishOptions";
import {
  describeExcludedIngredients,
  excludedIngredientsKey,
  type ExcludedIngredientIds,
} from "@/lib/dishIngredients";
import type { Dish } from "@/types/menu";
import type { CartItem } from "./types";

const STORAGE_KEY = "stolikqr.cart";
const EMPTY_ITEMS: CartItem[] = [];

type Listener = () => void;

let currentItems: CartItem[] = EMPTY_ITEMS;
let hydrated = false;
const listeners = new Set<Listener>();

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.dishId === "string" &&
    typeof item.unitPrice === "number" &&
    typeof item.quantity === "number" &&
    typeof item.optionsKey === "string"
  );
}

/** Fills in fields added after items may have already been persisted to storage. */
function normalize(item: CartItem): CartItem {
  return {
    ...item,
    excludedIngredientIds: item.excludedIngredientIds ?? [],
    excludedIngredientsSummary: item.excludedIngredientsSummary ?? { uk: "", en: "" },
  };
}

/** Re-reads localStorage and syncs in-memory state - used both at first load and on cross-tab storage events. */
function syncFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      currentItems = EMPTY_ITEMS;
      return;
    }
    const parsed: unknown = JSON.parse(raw);
    currentItems =
      Array.isArray(parsed) && parsed.every(isCartItem) ? parsed.map(normalize) : EMPTY_ITEMS;
  } catch {
    currentItems = EMPTY_ITEMS;
  }
}

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  syncFromStorage();
}

/** Cross-tab sync: the native `storage` event fires only in *other* tabs, never the one that wrote the change. */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    syncFromStorage();
    notify();
  });
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentItems));
  } catch {
    // Storage may be unavailable (e.g. private browsing quota) - ignore.
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

function setItems(next: CartItem[]) {
  currentItems = next;
  persist();
  notify();
}

export function getSnapshot(): CartItem[] {
  ensureHydrated();
  return currentItems;
}

export function getServerSnapshot(): CartItem[] {
  return EMPTY_ITEMS;
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addItem(
  dish: Dish,
  selections: Selections,
  excludedIngredientIds: ExcludedIngredientIds = [],
) {
  const key = `${selectionsKey(selections)}::${excludedIngredientsKey(excludedIngredientIds)}`;
  const existing = currentItems.find(
    (item) => item.dishId === dish.id && item.optionsKey === key,
  );

  if (existing) {
    setItems(
      currentItems.map((item) =>
        item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
    return;
  }

  const newItem: CartItem = {
    id: crypto.randomUUID(),
    dishId: dish.id,
    dishSlug: dish.slug,
    dishName: dish.name,
    emoji: dish.emoji,
    gradient: dish.gradient,
    unitPrice: computeDishPrice(dish, selections),
    selections,
    selectionsSummary: {
      uk: describeSelections(dish, selections, "uk" satisfies Locale),
      en: describeSelections(dish, selections, "en" satisfies Locale),
    },
    excludedIngredientIds,
    excludedIngredientsSummary: {
      uk: describeExcludedIngredients(dish, excludedIngredientIds, "uk" satisfies Locale),
      en: describeExcludedIngredients(dish, excludedIngredientIds, "en" satisfies Locale),
    },
    optionsKey: key,
    quantity: 1,
  };
  setItems([...currentItems, newItem]);
}

export function incrementItem(lineId: string) {
  setItems(
    currentItems.map((item) =>
      item.id === lineId ? { ...item, quantity: item.quantity + 1 } : item,
    ),
  );
}

export function decrementItem(lineId: string) {
  setItems(
    currentItems.map((item) =>
      item.id === lineId && item.quantity > 1
        ? { ...item, quantity: item.quantity - 1 }
        : item,
    ),
  );
}

export function removeItem(lineId: string) {
  setItems(currentItems.filter((item) => item.id !== lineId));
}

/** Empties the cart, e.g. once its items have been submitted as an order. */
export function clearCart() {
  setItems([]);
}
