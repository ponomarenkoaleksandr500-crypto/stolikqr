/**
 * Audible alert for a new waiter call.
 *
 * Synthesised with the Web Audio API rather than shipped as an audio file:
 * no asset to download on a phone behind restaurant wifi, no format
 * juggling, and nothing to 404 if the file is missed by a deploy.
 *
 * Browsers refuse to start audio until the user has interacted with the
 * page. A waiter arrives here by logging in, but that click happens on
 * the previous route, so the context can still be blocked on first load.
 * unlockWaiterAlert() is wired to the first interaction on the Waiter App
 * and resumes the context; if the browser refuses anyway, playing is a
 * no-op and the visual alert still does its job.
 */

let audioContext: AudioContext | null = null;

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioContext) return audioContext;
  const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!Ctor) return null;
  try {
    audioContext = new Ctor();
    return audioContext;
  } catch {
    return null;
  }
}

/** Call once from a real user gesture so the context is allowed to make sound later. */
export function unlockWaiterAlert(): void {
  const ctx = getContext();
  if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => {});
}

function beep(ctx: AudioContext, startAt: number, frequency: number): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startAt);

  // Shaped envelope rather than a raw square edge: an abrupt start/stop
  // clicks audibly on phone speakers.
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(0.25, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.28);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.3);
}

/**
 * Two rising notes - distinct from a notification "ding" so staff can tell
 * it apart from their own phone, and short enough not to be irritating on
 * a busy floor.
 */
export function playWaiterCallAlert(): void {
  const ctx = getContext();
  if (!ctx) return;

  const start = () => {
    const now = ctx.currentTime;
    beep(ctx, now, 880);
    beep(ctx, now + 0.22, 1174.7);
  };

  if (ctx.state === "suspended") {
    void ctx
      .resume()
      .then(start)
      .catch(() => {
        // Still blocked by the browser's autoplay policy - the red,
        // pulsing table on the floor plan is the fallback.
      });
    return;
  }
  start();
}
