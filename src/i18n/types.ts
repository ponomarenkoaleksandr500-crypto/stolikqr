export type Locale = "uk" | "en";

export type LocalizedText = Record<Locale, string>;

export const LOCALES: Locale[] = ["uk", "en"];

export const DEFAULT_LOCALE: Locale = "uk";
