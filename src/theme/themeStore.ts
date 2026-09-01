import { THEME_STORAGE_KEY } from "./themeScript";

/**
 * The guest's light/dark choice, modelled as an external store so React can
 * subscribe with useSyncExternalStore instead of mirroring it into state
 * inside an effect.
 *
 * Two states, and dark is the default: a QR menu is read in a dining room,
 * usually in low light, so that is what a first-time guest should get. The
 * device's prefers-color-scheme is not consulted - with a two-state toggle
 * there is nowhere to show a third "follow the system" state, and a hidden
 * third state is worse than an opinionated default.
 *
 * The only external source left is localStorage, which can still change
 * from another tab, so the storage event stays subscribed.
 */
export type ThemeMode = "light" | "dark";

export const DEFAULT_MODE: ThemeMode = "dark";

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key === THEME_STORAGE_KEY || event.key === null) emit();
}

export const themeStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    if (listeners.size === 1 && typeof window !== "undefined") {
      window.addEventListener("storage", onStorage);
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && typeof window !== "undefined") {
        window.removeEventListener("storage", onStorage);
      }
    };
  },

  getSnapshot(): ThemeMode {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : DEFAULT_MODE;
    } catch {
      // private mode / blocked site data - the default is the right answer
      return DEFAULT_MODE;
    }
  },

  /** Matches what the inline head script paints, so hydration agrees. */
  getServerSnapshot(): ThemeMode {
    return DEFAULT_MODE;
  },

  setMode(next: ThemeMode) {
    document.documentElement.setAttribute("data-mode", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // The preference just will not survive a reload; this page still works.
    }
    emit();
  },
};
