"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getSoundServerSnapshot,
  isAudioReady,
  isSoundEnabled,
  setSoundEnabled,
  subscribeAlert,
  unlockWaiterAlert,
} from "@/lib/waiterAlert";
import { BellOffIcon } from "@/components/icons";
import { BellIcon } from "@/components/table/tableIcons";

/**
 * Sound control for waiter-call alerts.
 *
 * This exists because of a browser rule, not because staff asked for a
 * setting: audio cannot start until the page has had a trusted user
 * gesture, and the login click happens on the previous route. Tapping this
 * button IS that gesture, so the first tap both turns the alert on and
 * makes it actually able to play. It doubles as a mute for a quiet room.
 *
 * While sound is on but the browser has not released the audio context yet,
 * the button says so rather than pretending the alert will be heard - a
 * silent "on" is worse than an honest "tap me".
 */
export function SoundToggle() {
  const enabled = useSyncExternalStore(subscribeAlert, isSoundEnabled, getSoundServerSnapshot);
  const ready = useSyncExternalStore(subscribeAlert, isAudioReady, () => false);

  const needsTap = enabled && !ready;

  // While the button is asking to be tapped, tapping it must do what it
  // says - unlock the audio - not mute the alert. Muting on that first tap
  // was the exact opposite of the label and cost the waiter their sound.
  const onClick = useCallback(() => {
    if (needsTap) {
      unlockWaiterAlert();
      return;
    }
    setSoundEnabled(!enabled);
  }, [enabled, needsTap]);
  const label = !enabled
    ? "Звук вимкнено — увімкнути"
    : needsTap
      ? "Торкніться, щоб дозволити звук"
      : "Звук увімкнено — вимкнути";

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={enabled}
      className={`inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${
        needsTap
          ? "animate-call-pulse border-gold-300 bg-gold-100 text-gold-700"
          : enabled
            ? "border-ink-200 bg-surface text-ink-600 hover:border-ink-300 hover:text-ink-900"
            : "border-ink-200 bg-ink-50 text-ink-400 hover:text-ink-600"
      }`}
    >
      {enabled ? <BellIcon className="h-[18px] w-[18px]" /> : <BellOffIcon className="h-[18px] w-[18px]" />}
    </button>
  );
}
