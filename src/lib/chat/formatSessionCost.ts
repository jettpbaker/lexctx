/** Formats micro-USD as `$00.04` — same rounding/padding as the former composer cost counter. */
export function formatSessionCost(microUsd: number) {
  const price = (microUsd / 1_000_000).toFixed(2).padStart(5, '0')
  return `$${price}`
}
