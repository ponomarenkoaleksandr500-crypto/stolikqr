/** Mirrors the [data-theme="..."] blocks in src/app/globals.css and backend THEME_KEYS (menu.service.ts). */
export const THEME_KEYS = ["classic", "midnight", "botanical", "coastal", "rose"] as const;
export type ThemeKey = (typeof THEME_KEYS)[number];

export interface ThemeOption {
  key: ThemeKey;
  label: string;
  description: string;
  /** Swatch preview colors, read directly from globals.css's values for this theme. */
  swatches: { paper: string; accent: string; sage: string };
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    key: "classic",
    label: "Classic Tavern",
    description: "Тепле дерево, паприка-акцент - оригінальний вигляд застосунку.",
    swatches: { paper: "#fbf6ec", accent: "#c24a22", sage: "#5c7a45" },
  },
  {
    key: "midnight",
    label: "Midnight Bistro",
    description: "Глибокий вугільний фон з теплим золотим акцентом.",
    swatches: { paper: "#17140f", accent: "#7a5e1e", sage: "#3f6b34" },
  },
  {
    key: "botanical",
    label: "Fresh Botanical",
    description: "Свіжа зелень шавлії з теракотовим акцентом.",
    swatches: { paper: "#f4f5ea", accent: "#a85c2b", sage: "#4f7a3a" },
  },
  {
    key: "coastal",
    label: "Coastal Citrus",
    description: "Морська бірюза з яскравим цитрусовим акцентом.",
    swatches: { paper: "#f2f7f6", accent: "#c94f12", sage: "#1f7d70" },
  },
  {
    key: "rose",
    label: "Rose Patisserie",
    description: "Ніжна пудра та вершкові тони кондитерської.",
    swatches: { paper: "#fbf1ee", accent: "#ab4560", sage: "#5c7a52" },
  },
];
