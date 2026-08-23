"use client";

import { useSyncExternalStore } from "react";
import * as orderStore from "./orderStore";

/** No context/provider needed - the order has no "open/closed" UI state to share, unlike the cart. */
export function useOrder() {
  const order = useSyncExternalStore(
    orderStore.subscribe,
    orderStore.getSnapshot,
    orderStore.getServerSnapshot,
  );

  return {
    order,
    submitCartItems: orderStore.submitCartItems,
    scheduleMockPayment: orderStore.scheduleMockPayment,
    clearOrder: orderStore.clearOrder,
  };
}
