import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

const LINKS = [
  { label: 'Debts', href: '/debts' as const },
  { label: 'History', href: '/history' as const },
];

export default function AccountScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-ledge-bg px-6" style={{ paddingTop: 64 }}>
      <Text className="text-lg font-bold text-ledge-accent">Account</Text>
      <Text className="mt-2 text-sm text-ledge-muted">
        Profile, plan settings, and premium sync status land here next.
      </Text>

      <View className="mt-6 gap-2">
        {LINKS.map((link) => (
          <Pressable
            key={link.href}
            onPress={() => router.push(link.href)}
            className="rounded-card bg-ledge-surface px-4 py-3"
          >
            <Text className="text-sm font-semibold text-ledge-accent">{link.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
