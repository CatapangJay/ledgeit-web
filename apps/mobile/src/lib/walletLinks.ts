import type { Wallet } from '@ledgeit/core';
import { useStore } from '@/lib/store';

/** Minimal wallet shape needed to render a link chip on a transaction row. */
export interface LinkedWalletInfo {
  name: string;
  icon: string;
}

// Memo cache: rebuilt only when the `wallets` array reference changes (zustand
// hands us a new array on every wallet/movement mutation, a stable one otherwise).
// This keeps the O(wallets × movements) scan to once-per-change instead of
// once-per-row, so a ledger with hundreds of rows doesn't repeat the work.
let cacheKey: Wallet[] | null = null;
let cacheMap: Map<string, LinkedWalletInfo> = new Map();

function buildMap(wallets: Wallet[]): Map<string, LinkedWalletInfo> {
  const map = new Map<string, LinkedWalletInfo>();
  for (const w of wallets) {
    for (const m of w.movements) {
      // Only 'linked' movements point at a real ledger transaction the user sees
      // in their feed; 'manual' movements own a wallet-internal transfer that
      // isn't surfaced as a wallet-tagged row.
      if (m.source === 'linked' && m.transactionId) {
        map.set(m.transactionId, { name: w.name, icon: w.icon });
      }
    }
  }
  return map;
}

/** transactionId → linked wallet info, memoized on the wallets array reference. */
export function getLinkedWalletMap(wallets: Wallet[]): Map<string, LinkedWalletInfo> {
  if (wallets !== cacheKey) {
    cacheKey = wallets;
    cacheMap = buildMap(wallets);
  }
  return cacheMap;
}

/**
 * The wallet a transaction is linked to (paid from / saved into), or null.
 * Backed by a map memoized on the wallets reference, so every subscribed row
 * shares one scan per wallet change rather than scanning independently.
 */
export function useLinkedWallet(transactionId: string): LinkedWalletInfo | null {
  return useStore((s) => getLinkedWalletMap(s.wallets).get(transactionId) ?? null);
}
