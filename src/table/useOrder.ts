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
  const lastOrder = useSyncExternalStore(
    orderStore.subscribe,
    orderStore.getLastOrderSnapshot,
    orderStore.getLastOrderServerSnapshot,
  );
  const reorderNotice = useSyncExternalStore(
    orderStore.subscribe,
    orderStore.getReorderNoticeSnapshot,
    orderStore.getReorderNoticeServerSnapshot,
  );

  return {
    order,
    lastOrder,
    reorderNotice,
    submitCartItems: orderStore.submitCartItems,
    reorderLast: orderStore.reorderLast,
    dismissReorderNotice: orderStore.dismissReorderNotice,
    clearOrder: orderStore.clearOrder,
  };
}
