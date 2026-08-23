export function formatPrice(price: number): string {
  return `${price.toLocaleString("uk-UA")} ₴`;
}

export function formatPriceDelta(delta: number): string {
  return `+${delta.toLocaleString("uk-UA")} ₴`;
}
