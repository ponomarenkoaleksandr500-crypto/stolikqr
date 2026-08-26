export function formatPrice(price: number): string {
  return `${price.toLocaleString("uk-UA")} ₴`;
}

/** Avatar-style initial for a restaurant name - skips a leading digit/symbol (e.g. "1920 Tavern" -> "T", not "1"). */
export function getNameMonogram(name: string): string {
  const letter = name.match(/\p{L}/u);
  return (letter ? letter[0] : name.trim().charAt(0)).toUpperCase();
}

export function formatPriceDelta(delta: number): string {
  return `+${delta.toLocaleString("uk-UA")} ₴`;
}

/** "щойно" / "N хв тому" / "N год тому" - staff-facing, Ukrainian only (Waiter App isn't localized). */
export function formatRelativeTimeUk(epochMs: number, now: number = Date.now()): string {
  const minutes = Math.floor((now - epochMs) / 60_000);
  if (minutes < 1) return "щойно";
  if (minutes < 60) return `${minutes} хв тому`;
  const hours = Math.floor(minutes / 60);
  return `${hours} год тому`;
}
