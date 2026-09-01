"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { themeStore, type ThemeMode } from "./themeStore";

export type { ThemeMode };

/**
 * Guest-level light/dark. Replaces the five per-restaurant brand themes
 * (DEC-002 §2): the mode is the viewer's choice now, not the venue's.
 *
 * Three states, not two - "system" is a real choice and it is the
 * default. Only an explicit light/dark writes data-mode; "system" clears
 * the attribute so the CSS prefers-color-scheme block takes over and
 * keeps tracking the device.
 *
 * No provider component is needed: the preference is an external store
 * (src/theme/themeStore.ts), so any component can subscribe directly.
 * ThemeProvider stays as a pass-through so the app tree and layout.tsx
 * do not need to care.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useTheme() {
  const mode = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getModeSnapshot,
    themeStore.getModeServerSnapshot,
  );
  const system = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSystemSnapshot,
    themeStore.getSystemServerSnapshot,
  );

  const setMode = useCallback((next: ThemeMode) => themeStore.setMode(next), []);

  const resolved: "light" | "dark" = mode === "system" ? system : mode;

  const toggle = useCallback(() => {
    setMode(mode === "system" ? "light" : mode === "light" ? "dark" : "system");
  }, [mode, setMode]);

  return useMemo(
    () => ({ mode, resolved, setMode, toggle }),
    [mode, resolved, setMode, toggle],
  );
}
