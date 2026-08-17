// ─── Money helpers ─────────────────────────────────────────────────────────────
// Shared cents ⇄ decimal conversion, used by:
//  - apps/mobile's SQLite layer, which stores all amounts as integer cents to
//    avoid floating-point rounding error on repeated sums.
//  - apps/mobile's sync engine, which converts to/from decimal at the Supabase
//    boundary (Postgres columns stay NUMERIC(12,2), matching what apps/web
//    already reads/writes directly).
//
// apps/web does not need these today (it talks to Postgres decimals directly),
// but they live here so both apps share one rounding-safe implementation.

/** Converts a decimal dollar/peso amount (e.g. 19.99) to integer cents (1999). */
export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

/** Converts integer cents (1999) back to a decimal amount (19.99). */
export function fromCents(cents: number): number {
  return cents / 100
}
