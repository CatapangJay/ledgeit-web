import { Text, View } from 'react-native';

export default function DebtsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-ledge-bg px-6">
      <Text className="text-lg font-bold text-ledge-accent">Debts</Text>
      <Text className="mt-2 text-center text-sm text-ledge-muted">
        Debt ledger (owed to me / I owe) ports over next.
      </Text>
    </View>
  );
}
