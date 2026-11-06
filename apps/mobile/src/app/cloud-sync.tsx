import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CaretLeft, Cloud, CloudCheck, CloudSlash, DeviceMobile, Crown } from 'phosphor-react-native';
import { useCloud, refreshEntitlement, signIn, signOut, signUp, syncNow } from '@/lib/sync/cloud';

function formatTime(iso: string | null): string {
  if (!iso) return 'never';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-2xl p-4" style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7edeb' }}>
      {children}
    </View>
  );
}

function Button({ label, onPress, variant = 'primary', disabled }: { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean }) {
  const bg = variant === 'primary' ? '#1f695d' : variant === 'danger' ? '#fdecea' : '#f0f4f2';
  const fg = variant === 'primary' ? '#ffffff' : variant === 'danger' ? '#b42318' : '#00352e';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="items-center rounded-xl py-3 active:opacity-80"
      style={{ backgroundColor: bg, opacity: disabled ? 0.5 : 1 }}
    >
      <Text className="text-sm font-semibold" style={{ color: fg }}>
        {label}
      </Text>
    </Pressable>
  );
}

function PlanCompare() {
  return (
    <Card>
      <View className="flex-row gap-3">
        <DeviceMobile size={18} weight="bold" color="#6e9990" />
        <View className="flex-1">
          <Text className="text-sm font-semibold" style={{ color: '#191c1c' }}>Free</Text>
          <Text className="text-xs" style={{ color: '#6e9990' }}>Your data is saved only on this device.</Text>
        </View>
      </View>
      <View className="my-3 h-px" style={{ backgroundColor: '#e7edeb' }} />
      <View className="flex-row gap-3">
        <Crown size={18} weight="bold" color="#b45309" />
        <View className="flex-1">
          <Text className="text-sm font-semibold" style={{ color: '#191c1c' }}>Premium</Text>
          <Text className="text-xs" style={{ color: '#6e9990' }}>
            Backed up to the cloud and synced across the web app and all your devices.
          </Text>
        </View>
      </View>
    </Card>
  );
}

function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (mode: 'in' | 'up') => {
    if (!email.trim() || password.length < 6) {
      Alert.alert('Check your details', 'Enter your email and a password of at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'in') {
        await signIn(email, password);
      } else if (await signUp(email, password)) {
        Alert.alert('Confirm your email', 'We sent you a confirmation link. Open it, then sign in here.');
      }
    } catch (e) {
      Alert.alert(mode === 'in' ? 'Sign-in failed' : 'Sign-up failed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = { backgroundColor: '#f8faf9', borderWidth: 1, borderColor: '#e7edeb', color: '#191c1c' } as const;

  return (
    <Card>
      <Text className="mb-3 text-sm font-semibold" style={{ color: '#191c1c' }}>
        Sign in with your LedgeIt account
      </Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#9fb8b2"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        className="mb-2 rounded-xl px-3 py-3 text-sm"
        style={inputStyle}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#9fb8b2"
        secureTextEntry
        autoComplete="password"
        className="mb-3 rounded-xl px-3 py-3 text-sm"
        style={inputStyle}
      />
      <View className="gap-2">
        <Button label={busy ? 'Please wait…' : 'Sign in'} onPress={() => run('in')} disabled={busy} />
        <Button label="Create account" variant="secondary" onPress={() => run('up')} disabled={busy} />
      </View>
    </Card>
  );
}

export default function CloudSyncScreen() {
  const router = useRouter();
  const { status, user, lastSyncedAt, error } = useCloud();
  const [busy, setBusy] = useState(false);

  const doSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
    } catch (e) {
      Alert.alert('Could not sign out', `${e instanceof Error ? e.message : String(e)}\n\nYour latest changes aren't in the cloud yet. Try again when you're online.`);
    } finally {
      setBusy(false);
    }
  };

  const confirmSignOut = () => {
    if (status === 'free') {
      void doSignOut();
      return;
    }
    Alert.alert(
      'Sign out?',
      'Your data stays safe in the cloud and will be removed from this device. Sign in again to get it back.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => void doSignOut() },
      ],
    );
  };

  const refresh = async () => {
    setBusy(true);
    await refreshEntitlement();
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView className="flex-1" style={{ backgroundColor: '#f8faf9' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pb-3 pt-16">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Back"
          className="h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: '#f0f4f2' }}
        >
          <CaretLeft size={16} weight="bold" color="#3f4946" />
        </Pressable>
        <View>
          <Text className="text-base font-bold tracking-tight" style={{ color: '#00352e' }}>
            Cloud Sync
          </Text>
          <Text className="text-[11px]" style={{ color: '#6e9990' }}>
            Access your ledger on web and mobile
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60, gap: 12 }} keyboardShouldPersistTaps="handled">
        {status === 'unconfigured' && (
          <Card>
            <View className="flex-row items-center gap-3">
              <CloudSlash size={20} weight="bold" color="#6e9990" />
              <Text className="flex-1 text-sm" style={{ color: '#3f4946' }}>
                Cloud sync isn&apos;t available in this build. Your data is saved on this device.
              </Text>
            </View>
          </Card>
        )}

        {status === 'loading' && (
          <View className="items-center py-10">
            <ActivityIndicator color="#1f695d" />
          </View>
        )}

        {status === 'signed-out' && (
          <>
            <PlanCompare />
            <AuthForm />
          </>
        )}

        {user && status === 'free' && (
          <>
            <Card>
              <View className="flex-row items-center gap-3">
                <DeviceMobile size={20} weight="bold" color="#6e9990" />
                <View className="flex-1">
                  <Text className="text-sm font-semibold" style={{ color: '#191c1c' }}>{user.email}</Text>
                  <Text className="text-xs" style={{ color: '#6e9990' }}>
                    Free plan · your data stays on this device only.
                  </Text>
                </View>
              </View>
            </Card>
            <PlanCompare />
            <Button label={busy ? 'Checking…' : 'I upgraded — refresh plan'} variant="secondary" onPress={refresh} disabled={busy} />
            <Button label="Sign out" variant="danger" onPress={confirmSignOut} disabled={busy} />
          </>
        )}

        {user && (status === 'syncing' || status === 'synced' || status === 'error') && (
          <>
            <Card>
              <View className="flex-row items-center gap-3">
                {status === 'error' ? (
                  <CloudSlash size={20} weight="bold" color="#b42318" />
                ) : status === 'syncing' ? (
                  <Cloud size={20} weight="bold" color="#1f695d" />
                ) : (
                  <CloudCheck size={20} weight="bold" color="#1f695d" />
                )}
                <View className="flex-1">
                  <Text className="text-sm font-semibold" style={{ color: '#191c1c' }}>{user.email}</Text>
                  <Text className="text-xs" style={{ color: status === 'error' ? '#b42318' : '#6e9990' }}>
                    {status === 'syncing'
                      ? 'Premium · Syncing…'
                      : status === 'error'
                        ? "Premium · Couldn't sync. Changes are saved here and will retry."
                        : `Premium · Synced ${formatTime(lastSyncedAt)}`}
                  </Text>
                  {status === 'error' && error ? (
                    <Text className="mt-1 text-[11px]" style={{ color: '#6e9990' }} numberOfLines={2}>
                      {error}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Card>
            <Button label="Sync now" onPress={() => void syncNow()} disabled={busy || status === 'syncing'} />
            <Button label={busy ? 'Signing out…' : 'Sign out'} variant="danger" onPress={confirmSignOut} disabled={busy} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
