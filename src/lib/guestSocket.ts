import { io, type Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

let socket: Socket | null = null;
let currentTableId: string | null = null;

/**
 * Joins the table's realtime room (see backend GuestGateway). No auth - a
 * guest only ever receives their own table's updates. Handlers are treated
 * as "something changed, go refetch" signals rather than carrying state
 * themselves - simpler and avoids partial-merge bugs (see orderStore.ts /
 * waiterStore.ts / paymentStore.ts's load* functions).
 */
export function connectGuestSocket(
  tableId: string,
  handlers: {
    onOrderUpdate: () => void;
    onWaiterCallUpdate: () => void;
    onPaymentUpdate: () => void;
  },
): void {
  if (socket && currentTableId === tableId) return;
  socket?.close();
  currentTableId = tableId;
  socket = io(`${API_URL}/ws/guest`, {
    query: { tableId },
    transports: ["websocket"],
  });
  socket.on("order.status.updated", handlers.onOrderUpdate);
  socket.on("waiterCall.status.updated", handlers.onWaiterCallUpdate);
  socket.on("payment.status.updated", handlers.onPaymentUpdate);
}
