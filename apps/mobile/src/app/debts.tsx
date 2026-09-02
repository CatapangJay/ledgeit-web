import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { CaretLeft } from 'phosphor-react-native';
import DebtLedger from '@/components/debt/DebtLedger';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useDeferredMount } from '@/lib/useDeferredMount';

export default function DebtsScreen() {
  const router = useRouter();
  const ready = useDeferredMount();

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
            Debts & Loans
          </Text>
          <Text className="text-[11px]" style={{ color: '#6e9990' }}>
            Money you've lent or borrowed
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {ready ? (
          <DebtLedger />
        ) : (
          <View className="gap-3">
            <SkeletonCard height={90} />
            <SkeletonCard height={90} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
