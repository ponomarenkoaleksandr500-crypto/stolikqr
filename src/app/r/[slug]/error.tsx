"use client";

import { useEffect } from "react";
import { useLocale } from "@/i18n/LocaleProvider";

export default function RestaurantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLocale();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-paper px-4 py-16 text-center">
      <p className="font-display text-lg font-semibold text-ink-900">{t("common.errorTitle")}</p>
      <button
        type="button"
        onClick={reset}
        className="flex h-11 items-center justify-center rounded-full bg-accent-600 px-6 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
      >
        {t("common.errorRetry")}
      </button>
    </div>
  );
}
