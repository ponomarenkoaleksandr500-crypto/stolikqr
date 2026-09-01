import { WAITER_ALERT_WAV } from "./waiterAlertSound";

/**
 * Alert for a new waiter call: a tone plus a vibration. There is no way to
 * turn it off - a missed call is the thing this product exists to prevent.
 *
 * Why an <audio> element and not the Web Audio API, which this used before:
 * a single play() inside a real user gesture permanently authorises later
 * programmatic playback of that element, including on iOS. The Web Audio
 * route needed the AudioContext to be resumed inside a gesture too, but was
 * far more fragile in practice and kept staying "suspended" on real phones.
 *
 * Why unlocking is wired to the login submit: that is the one tap every
 * waiter makes, it is a genuine user gesture, and Next.js keeps the same JS
 * context across the client-side navigation to /waiter - so the element
 * unlocked on the login screen is still unlocked on the floor plan. Every
 * later interaction re-arms it as well, in case the session was restored
 * without a login.
 */

let audio: HTMLAudioElement | null = null;
let unlocked = false;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (audio) return audio;
  audio = new Audio(WAITER_ALERT_WAV);
  audio.preload = "auto";
  // Keeps iOS from taking over the screen with a media player.
  audio.setAttribute("playsinline", "");
  audio.volume = 1;
  return audio;
}

/**
 * Must be called from a real user gesture. Playing and immediately resetting
 * is the standard way to authorise an element for later autoplay; the sound
 * is inaudible because it is stopped within a few milliseconds.
 */
export function unlockWaiterAlert(): void {
  const el = getAudio();
  if (!el || unlocked) return;
  // Muted so the unlock itself is inaudible. The volume is NOT restored
  // here on purpose: play() resolves asynchronously, repeated unlock
  // attempts kept re-muting the element, and a call landing inside that
  // window played silently - which is exactly how the alert reached a real
  // phone as "no sound". playWaiterCallAlert() below now sets the volume
  // itself, every time, so a leftover 0 can never survive into an alert.
  el.volume = 0;
  void el
    .play()
    .then(() => {
      el.pause();
      el.currentTime = 0;
      unlocked = true;
    })
    .catch(() => {
      // Not allowed yet - the next gesture will try again.
    });
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

function vibrate(): void {
  // Android/Chrome only. iOS Safari has no Vibration API at all, and it also
  // silences this kind of audio when the ring/silent switch is off - which
  // is exactly why the red pulsing tile is not optional.
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate([300, 120, 300, 120, 300]);
  } catch {
    // Some browsers throw when the page is hidden; not worth reporting.
  }
}

/** Fired on every new waiter call. Vibration first, so it still reports when audio is blocked. */
export function playWaiterCallAlert(): void {
  vibrate();

  const el = getAudio();
  if (!el) return;
  // Always assert full volume: the unlock path mutes this element, and any
  // leftover 0 would turn the alert into silence.
  el.volume = 1;
  el.muted = false;
  try {
    el.currentTime = 0;
  } catch {
    // Safari throws if metadata is not loaded yet; play() below still works.
  }
  void el.play().catch(() => {
    // Blocked because no gesture has happened yet in this document. The next
    // interaction unlocks it; the pulsing red table covers this moment.
    unlocked = false;
  });
}
