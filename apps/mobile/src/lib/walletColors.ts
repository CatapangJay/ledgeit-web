// Wallet-kind accent color key → concrete hex. Kept in one place so every
// wallet surface (Wallets screen, dashboard, ledger, insights) renders the same
// palette. Keys mirror WALLET_KINDS[n].color in packages/core/types.ts.
export const WALLET_COLOR_HEX: Record<string, string> = {
  teal: '#0f766e',
  indigo: '#4338ca',
  rose: '#be123c',
  amber: '#b45309',
  green: '#15803d',
  slate: '#334155',
};

/** Resolve a wallet's accent color key to a hex value, defaulting to teal. */
export function walletAccent(colorKey: string): string {
  return WALLET_COLOR_HEX[colorKey] ?? WALLET_COLOR_HEX.teal;
}
