import { THEME_STORAGE_KEY } from "./themeScript";

/**
 * The guest's light/dark preference, modelled as an external store so
 * React can subscribe to it with useSyncExternalStore instead of
 * mirroring it into state inside an effect.
 *
 * There are two independent external sources here and both can change
 * after first paint: the stored choice (including from another tab) and
 * the device's own colour-scheme preference (a phone flipping to dark at
 * sunset). Snapshots are primitive strings so referential equality is
 * automatic.
 */
export type ThemeMode = "system" | "light" | "dark";

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribeAll(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
    mediaQuery()?.addEventListener("change", emit);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
      mediaQuery()?.removeEventListener("change", emit);
    }
  };
}

function onStorage(event: StorageEvent) {
  if (event.key === THEME_STORAGE_KEY || event.key === null) emit();
}

function mediaQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  return window.matchMedia("(prefers-color-scheme: dark)");
}

export const themeStore = {
  subscribe: subscribeAll,

  getModeSnapshot(): ThemeMode {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "light" || stored === "dark") return stored;
    } catch {
      // private mode / blocked site data - "system" is the right default
    }
    return "system";
  },

  /** On the server nobody has a preference yet; the inline head script paints the real one. */
  getModeServerSnapshot(): ThemeMode {
    return "system";
  },

  getSystemSnapshot(): "light" | "dark" {
    return mediaQuery()?.matches ? "dark" : "light";
  },

  getSystemServerSnapshot(): "light" | "dark" {
    return "light";
  },

  setMode(next: ThemeMode) {
    const root = document.documentElement;
    if (next === "system") root.removeAttribute("data-mode");
    else root.setAttribute("data-mode", next);

    try {
      if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // The preference just will not survive a reload; this page is fine.
    }
    emit();
  },
};
