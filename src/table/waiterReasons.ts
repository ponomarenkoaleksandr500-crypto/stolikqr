import type { TranslationKey } from "@/i18n/translations";

export interface WaiterReason {
  key: string;
  labelKey: TranslationKey;
  /** "Bring the bill" is the one reason that also drives the mock payment simulation. */
  requestsBill?: boolean;
}

/** Easy to extend later - just add or reorder entries here. */
export const WAITER_REASONS: WaiterReason[] = [
  { key: "help", labelKey: "waiter.reason.help" },
  { key: "bill", labelKey: "waiter.reason.bill", requestsBill: true },
  { key: "water", labelKey: "waiter.reason.water" },
  { key: "clean", labelKey: "waiter.reason.clean" },
  { key: "other", labelKey: "waiter.reason.other" },
];
