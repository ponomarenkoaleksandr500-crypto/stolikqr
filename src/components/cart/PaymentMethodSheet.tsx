"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { useDialog } from "@/lib/useDialog";
import { formatPrice } from "@/lib/format";
import { CheckIcon, CloseIcon, CardIcon } from "@/components/icons";
import { usePayment } from "@/table/usePayment";
import { useTableSession } from "@/table/TableSessionProvider";
import type { TranslationKey } from "@/i18n/translations";
import type { PaymentMethod } from "@/lib/api";

const CONFIRM_FEEDBACK_MS = 1300;

// Bank cards + the two big phone wallets cover the vast majority of
// in-restaurant guest checkouts in Ukraine; Expirenza is the one
// restaurant-specific guest-payment platform explicitly asked for. All four
// are stubs today (see backend PaymentsService.create) - real gateways get
// wired in behind the same `provider` value later without touching this UI.
const PAYMENT_METHODS: { key: PaymentMethod; labelKey: TranslationKey; hasIcon?: boolean }[] = [
  { key: "CARD", labelKey: "payment.methodCard", hasIcon: true },
  { key: "APPLE_PAY", labelKey: "payment.methodApplePay" },
  { key: "GOOGLE_PAY", labelKey: "payment.methodGooglePay" },
  { key: "EXPIRENZA", labelKey: "payment.methodExpirenza" },
];

export function PaymentMethodSheet({ amount, onClose }: { amount: number; onClose: () => void }) {
  const { t } = useLocale();
  const { dialogRef, closing, requestClose } = useDialog(onClose);
  const { session } = useTableSession();
  const { payWithMethod } = usePayment();
  const [pendingMethod, setPendingMethod] = useState<PaymentMethod | null>(null);
  const [paid, setPaid] = useState(false);
  const [payFailed, setPayFailed] = useState(false);
  const confirmTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) window.clearTimeout(confirmTimeoutRef.current);
    };
  }, []);

  const handleSelect = async (method: PaymentMethod) => {
    if (!session || pendingMethod) return;
    setPendingMethod(method);
    setPayFailed(false);
    const succeeded = await payWithMethod(session.id, method);
    setPendingMethod(null);
    if (!succeeded) {
      setPayFailed(true);
      return;
    }
    setPaid(true);
    confirmTimeoutRef.current = window.setTimeout(requestClose, CONFIRM_FEEDBACK_MS);
  };

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
        aria-labelledby="payment-sheet-title"
        tabIndex={-1}
        className={`relative flex w-full flex-col overflow-hidden rounded-t-[2rem] bg-surface px-5 pb-6 pt-3 outline-none sm:max-w-lg sm:rounded-[2rem] ${
          closing ? "animate-sheet-out" : "animate-sheet-in"
        }`}
      >
        <span
          aria-hidden="true"
          className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-ink-200 sm:hidden"
        />

        {paid ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sage-100 text-sage-700">
              <CheckIcon className="h-6 w-6" />
            </span>
            <p className="font-display text-lg font-semibold text-ink-900">
              {t("payment.successTitle")}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="payment-sheet-title" className="font-display text-xl font-semibold text-ink-900">
                  {t("payment.title")}
                </h2>
                <p className="mt-1 text-sm text-ink-600">
                  {t("payment.hint")} · <span className="font-semibold text-ink-900">{formatPrice(amount)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={requestClose}
                aria-label={t("dish.close")}
                className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.key}
                  type="button"
                  disabled={pendingMethod !== null}
                  onClick={() => void handleSelect(method.key)}
                  className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-ink-200 px-4 text-left text-sm font-medium text-ink-800 transition-colors hover:border-accent-300 hover:bg-accent-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {method.hasIcon && <CardIcon className="h-5 w-5 shrink-0 text-ink-600" />}
                  {t(method.labelKey)}
                  {pendingMethod === method.key && (
                    <span className="ml-auto text-xs text-ink-500">…</span>
                  )}
                </button>
              ))}
            </div>
            {payFailed && (
              <p className="mt-3 text-center text-xs font-medium text-red-600">
                {t("payment.failed")}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
