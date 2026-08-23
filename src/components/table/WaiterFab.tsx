"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { useDialog } from "@/lib/useDialog";
import { CheckIcon, CloseIcon } from "@/components/icons";
import { BellIcon } from "./tableIcons";
import * as waiterStore from "@/table/waiterStore";
import { WAITER_REASONS } from "@/table/waiterReasons";
import { useOrder } from "@/table/useOrder";
import { useTableSession } from "@/table/TableSessionProvider";

const CONFIRM_FEEDBACK_MS = 1300;

export function WaiterFab() {
  const { t } = useLocale();
  const [sheetOpen, setSheetOpen] = useState(false);
  const call = useSyncExternalStore(
    waiterStore.subscribe,
    waiterStore.getSnapshot,
    waiterStore.getServerSnapshot,
  );
  const onCooldown = waiterStore.isOnCooldown(call);

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-label={t("waiter.title")}
        className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex h-12 items-center gap-2 rounded-full bg-ink-950 px-4 text-sm font-semibold text-paper shadow-lg shadow-ink-950/25 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2"
      >
        <BellIcon className="h-5 w-5 text-accent-300" />
        {onCooldown ? t("waiter.cooldownLabel") : t("waiter.callButton")}
      </button>
      {sheetOpen && <WaiterSheet onClose={() => setSheetOpen(false)} />}
    </>
  );
}

function WaiterSheet({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const { dialogRef, closing, requestClose } = useDialog(onClose);
  const { scheduleMockPayment } = useOrder();
  const { session, table } = useTableSession();
  const [confirmedKey, setConfirmedKey] = useState<string | null>(null);
  const confirmTimeoutRef = useRef<number | null>(null);

  const call = useSyncExternalStore(
    waiterStore.subscribe,
    waiterStore.getSnapshot,
    waiterStore.getServerSnapshot,
  );
  const onCooldown = waiterStore.isOnCooldown(call);

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) window.clearTimeout(confirmTimeoutRef.current);
    };
  }, []);

  const handleSelect = (reasonKey: string, requestsBill?: boolean) => {
    // WaiterFab is only ever mounted in table mode (see RestaurantShell), so
    // session/table are expected to be present; bail defensively if not.
    if (!session || !table) return;
    waiterStore.callWaiter(reasonKey, table.id, session.id);
    if (requestsBill) scheduleMockPayment();
    setConfirmedKey(reasonKey);
    confirmTimeoutRef.current = window.setTimeout(requestClose, CONFIRM_FEEDBACK_MS);
  };

  const showConfirmation = confirmedKey !== null || onCooldown;
  const reasonKey = confirmedKey ?? call?.reasonKey ?? null;
  const reason = WAITER_REASONS.find((candidate) => candidate.key === reasonKey);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className={`absolute inset-0 bg-ink-950/55 ${
          closing ? "animate-overlay-out" : "animate-overlay-in"
        }`}
        onClick={requestClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="waiter-sheet-title"
        tabIndex={-1}
        className={`relative flex w-full flex-col overflow-hidden rounded-t-[2rem] bg-surface px-5 pb-6 pt-3 outline-none sm:max-w-lg sm:rounded-[2rem] ${
          closing ? "animate-sheet-out" : "animate-sheet-in"
        }`}
      >
        <span
          aria-hidden="true"
          className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-ink-200 sm:hidden"
        />

        {showConfirmation ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sage-100 text-sage-700">
              <CheckIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-ink-900">
                {t("waiter.confirmTitle")}
              </p>
              {reason && <p className="mt-1 text-sm text-ink-500">{t(reason.labelKey)}</p>}
            </div>
            <button
              type="button"
              onClick={requestClose}
              className="mt-2 flex h-11 items-center justify-center rounded-full border border-ink-200 px-5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
            >
              <CloseIcon className="mr-1.5 h-4 w-4" />
              {t("dish.close")}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <h2 id="waiter-sheet-title" className="font-display text-xl font-semibold text-ink-900">
                {t("waiter.title")}
              </h2>
              <button
                type="button"
                onClick={requestClose}
                aria-label={t("dish.close")}
                className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1.5 text-sm text-ink-500">{t("waiter.reasonHint")}</p>
            <div className="mt-4 flex flex-col gap-2">
              {WAITER_REASONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => handleSelect(option.key, option.requestsBill)}
                  className="flex min-h-12 items-center justify-between rounded-2xl border border-ink-200 px-4 text-left text-sm font-medium text-ink-800 transition-colors hover:border-accent-300 hover:bg-accent-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
                >
                  {t(option.labelKey)}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
