"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { themeStore, type ThemeMode } from "./themeStore";

export type { ThemeMode };

/**
 * Guest-level light/dark. Two states, dark by default - see themeStore.
 *
 * No provider component is needed: the preference is an external store
 * (src/theme/themeStore.ts), so any component can subscribe directly.
 * ThemeProvider stays as a pass-through so layout.tsx and the app tree do
 * not have to care.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useTheme() {
  const mode = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSnapshot,
    themeStore.getServerSnapshot,
  );

  const setMode = useCallback((next: ThemeMode) => themeStore.setMode(next), []);
  const toggle = useCallback(
    () => themeStore.setMode(mode === "dark" ? "light" : "dark"),
    [mode],
  );

  return useMemo(() => ({ mode, setMode, toggle }), [mode, setMode, toggle]);
}
