"use client";

import { useLocale } from "@/i18n/LocaleProvider";

export default function RestaurantLoading() {
  const { t } = useLocale();

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-paper px-4 py-16 text-center">
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-accent-500"
      />
      <p className="text-sm text-ink-500">{t("common.loading")}</p>
    </div>
  );
}
