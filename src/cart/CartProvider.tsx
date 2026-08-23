"use client";

import { createContext, useContext, useMemo, useState, useSyncExternalStore } from "react";
import type { Selections } from "@/lib/dishOptions";
import type { ExcludedIngredientIds } from "@/lib/dishIngredients";
import type { Dish } from "@/types/menu";
import * as cartStore from "./cartStore";
import type { CartItem } from "./types";

interface CartContextValue {
  items: CartItem[];
  totalCount: number;
  totalPrice: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  addItem: (dish: Dish, selections: Selections, excludedIngredientIds?: ExcludedIngredientIds) => void;
  incrementItem: (lineId: string) => void;
  decrementItem: (lineId: string) => void;
  removeItem: (lineId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot,
  );
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo<CartContextValue>(() => {
    const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    return {
      items,
      totalCount,
      totalPrice,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((prev) => !prev),
      addItem: cartStore.addItem,
      incrementItem: cartStore.incrementItem,
      decrementItem: cartStore.decrementItem,
      removeItem: cartStore.removeItem,
      clearCart: cartStore.clearCart,
    };
  }, [items, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
