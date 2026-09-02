import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { CaretLeft } from 'phosphor-react-native';
import WalletLedger from '@/components/wallet/WalletLedger';

export default function WalletsScreen() {
  const router = useRouter();

  return (
    <View className="flex-1" style={{ backgroundColor: '#f8faf9' }}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-5 pb-3 pt-16">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Back to account"
          className="h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: '#f0f4f2' }}
        >
          <CaretLeft size={16} weight="bold" color="#3f4946" />
        </Pressable>
        <View>
          <Text className="text-base font-bold tracking-tight" style={{ color: '#00352e' }}>
            Wallets
          </Text>
          <Text className="text-[11px]" style={{ color: '#6e9990' }}>
            Savings, investments & goals you set aside
          </Text>
        </View>
      </View>

      {/* WalletLedger owns its own scroll + sheets, fills remaining space. */}
      <View className="flex-1 px-5">
        <WalletLedger />
      </View>
    </View>
  );
}
