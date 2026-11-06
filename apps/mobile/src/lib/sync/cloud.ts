import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useStore, pickSyncData, type SyncData } from '@/lib/store';
import { fetchCloudData, hasChanges, mergeForFirstLink, pushChanges } from '@/lib/sync/remote';

// ─── Cloud sync (premium only) ───────────────────────────────────────────────
// Free users: the app store is persisted on-device and nothing here runs past
// "signed out" / "free". Premium users: local data stays the source of truth
// for the UI (instant + offline), and this engine mirrors it to Supabase:
//
//   • `base` = what the cloud is known to hold (persisted per user). Every local
//     change is diffed against it and pushed (debounced). If a push fails (e.g.
//     offline), `base` is left alone so the same diff is retried later.
//   • On sign-in / app foreground / "Sync now": push pending changes, then pull
//     the full cloud copy so edits made on web or another device land here.
//   • First link of this device to an account merges local-only rows into the
//     cloud instead of discarding them.

export type CloudStatus =
  | 'unconfigured' // no Supabase env vars in this build
  | 'loading'
  | 'signed-out'
  | 'free' // signed in, not premium → device-only
  | 'syncing'
  | 'synced'
  | 'error';

interface CloudState {
  status: CloudStatus;
  user: User | null;
  isPremium: boolean;
  lastSyncedAt: string | null;
  error: string | null;
}

export const useCloud = create<CloudState>()(() => ({
  status: isSupabaseConfigured ? 'loading' : 'unconfigured',
  user: null,
  isPremium: false,
  lastSyncedAt: null,
  error: null,
}));

const PUSH_DEBOUNCE_MS = 1500;
const baseKey = (userId: string) => `ledgeit-sync-base:${userId}`;
const premiumKey = (userId: string) => `ledgeit-premium:${userId}`;

async function loadBase(userId: string): Promise<SyncData | null> {
  const raw = await AsyncStorage.getItem(baseKey(userId));
  return raw ? (JSON.parse(raw) as SyncData) : null;
}

async function saveBase(userId: string, data: SyncData): Promise<void> {
  await AsyncStorage.setItem(baseKey(userId), JSON.stringify(data));
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// ─── Entitlements ─────────────────────────────────────────────────────────────

/** Premium comes from `user_entitlements` (read-only for users, see migration
 *  0017). The last known answer is cached so an offline launch doesn't demote
 *  a premium user. */
async function checkPremium(userId: string): Promise<boolean> {
  try {
    const { data, error } = await getSupabase()
      .from('user_entitlements')
      .select('is_premium, expires_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    const premium = Boolean(
      data?.is_premium && (!data.expires_at || new Date(data.expires_at).getTime() > Date.now()),
    );
    await AsyncStorage.setItem(premiumKey(userId), premium ? '1' : '0');
    return premium;
  } catch {
    return (await AsyncStorage.getItem(premiumKey(userId))) === '1';
  }
}

// ─── Engine ───────────────────────────────────────────────────────────────────

// Serialize all sync work so pushes and pulls never interleave.
let queue: Promise<void> = Promise.resolve();
function enqueue(job: () => Promise<void>): Promise<void> {
  queue = queue.then(job, job);
  return queue;
}

function activeUserId(): string | null {
  const { user, isPremium } = useCloud.getState();
  return user && isPremium ? user.id : null;
}

async function pushPending(userId: string): Promise<SyncData> {
  const local = pickSyncData(useStore.getState());
  const base = await loadBase(userId);
  if (base && hasChanges(base, local)) {
    await pushChanges(userId, base, local);
    await saveBase(userId, local);
  }
  return local;
}

/** Push local changes, then pull the cloud copy into the app. */
export function syncNow(): Promise<void> {
  return enqueue(async () => {
    const userId = activeUserId();
    if (!userId) return;
    useCloud.setState({ status: 'syncing', error: null });
    try {
      const hadBase = (await loadBase(userId)) !== null;
      const pushed = await pushPending(userId);
      const cloud = await fetchCloudData(userId);

      // Edited while we were fetching? Don't clobber the edit — sync again shortly.
      if (hasChanges(pushed, pickSyncData(useStore.getState()))) {
        setTimeout(() => void syncNow(), PUSH_DEBOUNCE_MS);
        return;
      }

      if (hadBase || useStore.getState().isSampleData) {
        // Linked before, or this device only has dev sample data: cloud wins.
        useStore.getState().replaceSyncData(cloud);
        await saveBase(userId, cloud);
      } else {
        // First link: cloud keeps everything; local-only rows are uploaded.
        const merged = mergeForFirstLink(cloud, pushed);
        useStore.getState().replaceSyncData(merged);
        await pushChanges(userId, cloud, merged);
        await saveBase(userId, merged);
      }
      useCloud.setState({ status: 'synced', lastSyncedAt: new Date().toISOString() });
    } catch (e) {
      useCloud.setState({ status: 'error', error: errorMessage(e) });
    }
  });
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void enqueue(async () => {
      const userId = activeUserId();
      if (!userId) return;
      // No base yet means the first full sync hasn't finished — let it handle this.
      if (!(await loadBase(userId))) return;
      useCloud.setState({ status: 'syncing', error: null });
      try {
        await pushPending(userId);
        useCloud.setState({ status: 'synced', lastSyncedAt: new Date().toISOString() });
      } catch (e) {
        useCloud.setState({ status: 'error', error: errorMessage(e) });
      }
    });
  }, PUSH_DEBOUNCE_MS);
}

async function onUser(user: User | null) {
  if (!user) {
    useCloud.setState({ status: 'signed-out', user: null, isPremium: false, error: null });
    return;
  }
  useCloud.setState({ user, status: 'loading', error: null });
  const isPremium = await checkPremium(user.id);
  useCloud.setState({ isPremium, status: isPremium ? 'syncing' : 'free' });
  if (isPremium) await syncNow();
}

/** Re-check the plan (e.g. right after purchasing premium). */
export async function refreshEntitlement(): Promise<void> {
  await onUser(useCloud.getState().user);
}

let started = false;

/** Start auth tracking + sync. Safe to call more than once. */
export function initCloud(): void {
  if (started || !isSupabaseConfigured) return;
  started = true;

  const start = () => {
    const supabase = getSupabase();
    supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id ?? null;
      const changedUser = userId !== (useCloud.getState().user?.id ?? null);
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT' || (event === 'SIGNED_IN' && changedUser)) {
        // Defer: awaiting Supabase calls inside this callback can deadlock auth.
        setTimeout(() => void onUser(session?.user ?? null), 0);
      }
    });

    // Mirror every local data change to the cloud (premium only).
    useStore.subscribe((state, prev) => {
      if (activeUserId() && hasChanges(pickSyncData(prev), pickSyncData(state))) schedulePush();
    });

    // Pick up edits made on web / other devices when returning to the app.
    AppState.addEventListener('change', (s) => {
      if (s === 'active' && activeUserId()) void syncNow();
    });
  };

  // Never diff against pre-hydration (initial) state.
  if (useStore.persist.hasHydrated()) start();
  else useStore.persist.onFinishHydration(start);
}

// ─── Auth actions ─────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

/** Returns true when the account still needs email confirmation. */
export async function signUp(email: string, password: string): Promise<boolean> {
  const { data, error } = await getSupabase().auth.signUp({ email: email.trim(), password });
  if (error) throw error;
  return !data.session;
}

/**
 * Sign out. For premium users the cloud holds the data, so pending changes are
 * flushed first and the device copy is cleared (the next account to sign in on
 * this device must not inherit it). Free users keep their on-device data.
 */
export async function signOut(): Promise<void> {
  const { user, isPremium } = useCloud.getState();
  if (user && isPremium) {
    await enqueue(async () => {
      await pushPending(user.id);
    });
  }
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
  if (user && isPremium) {
    await AsyncStorage.removeItem(baseKey(user.id));
    useStore.getState().resetLocalData();
  }
}
