"use client";

import { useSyncExternalStore } from "react";
import * as paymentStore from "./paymentStore";

/** No context/provider needed - mirrors useOrder.ts. */
export function usePayment() {
  const payment = useSyncExternalStore(
    paymentStore.subscribe,
    paymentStore.getSnapshot,
    paymentStore.getServerSnapshot,
  );

  return {
    payment,
    isPending: paymentStore.isPending(payment),
    isSucceeded: paymentStore.isSucceeded(payment),
    isDemo: paymentStore.isDemo(payment),
    payWithMethod: paymentStore.payWithMethod,
  };
}
