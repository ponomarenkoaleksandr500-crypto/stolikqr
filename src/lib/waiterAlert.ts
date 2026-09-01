/**
 * Alert for a new waiter call: a short tone plus a vibration.
 *
 * The sound is synthesised with the Web Audio API rather than shipped as an
 * audio file - nothing to download on restaurant wifi and nothing to 404 on
 * a deploy.
 *
 * The hard part is not making the sound, it is being allowed to. Browsers
 * refuse audio until the page has had a trusted user gesture, and the
 * waiter's login click happens on the previous route. Relying on "the first
 * time they happen to touch the screen" is exactly why this did not work:
 * a call can easily arrive before the waiter touches anything.
 *
 * So there is an explicit control in the Waiter App header. Tapping it is
 * itself the gesture that unlocks audio, and it doubles as a mute for a
 * quiet room. Passive unlocking on first interaction is kept as a bonus,
 * not as the mechanism.
 */

const SOUND_KEY = "stolikqr:waiterSound";

let audioContext: AudioContext | null = null;
const listeners = new Set<() => void>();

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

function emit() {
  for (const listener of listeners) listener();
}

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioContext) return audioContext;
  const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!Ctor) return null;
  try {
    audioContext = new Ctor();
  } catch {
    return null;
  }
  return audioContext;
}

/** Subscribe to sound-preference / unlock-state changes (used by the header toggle). */
export function subscribeAlert(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function getSoundServerSnapshot(): boolean {
  return true;
}

/** True once the browser has actually let the audio context start. */
export function isAudioReady(): boolean {
  return audioContext?.state === "running";
}

/**
 * Must be called from a real user gesture. Creating AND resuming the context
 * synchronously inside the handler is what iOS Safari requires; doing it
 * later, or from a synthetic event, silently leaves it suspended.
 */
export function unlockWaiterAlert(): void {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().then(emit).catch(() => {});
  } else {
    emit();
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
  } catch {
    // Preference will not persist; the current shift still works.
  }
  if (enabled) unlockWaiterAlert();
  emit();
}

function beep(ctx: AudioContext, startAt: number, frequency: number): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startAt);

  // Shaped envelope: an abrupt start/stop clicks audibly on phone speakers.
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(0.3, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.28);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.3);
}

function vibrate(): void {
  // Android/Chrome only - iOS Safari has no Vibration API at all, which is
  // why the sound and the red pulsing tile both still matter.
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate([180, 90, 180]);
  } catch {
    // Some browsers throw when the page is not visible; not worth reporting.
  }
}

/**
 * Two rising notes, distinct from a phone's own notification ding, plus a
 * double buzz. Short enough not to be irritating on a busy floor.
 */
export function playWaiterCallAlert(): void {
  vibrate();
  if (!isSoundEnabled()) return;

  const ctx = getContext();
  if (!ctx) return;

  const play = () => {
    const now = ctx.currentTime;
    beep(ctx, now, 880);
    beep(ctx, now + 0.22, 1174.7);
  };

  if (ctx.state === "suspended") {
    // Last-ditch: browsers sometimes allow a resume here if the waiter has
    // interacted with the page at all. If not, the red pulsing table and the
    // vibration above are the fallback.
    void ctx.resume().then(play).catch(() => {});
    return;
  }
  play();
}
