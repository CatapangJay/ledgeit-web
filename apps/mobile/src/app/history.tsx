import { Text, View } from 'react-native';

export default function HistoryScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-ledge-bg px-6">
      <Text className="text-lg font-bold text-ledge-accent">History</Text>
      <Text className="mt-2 text-center text-sm text-ledge-muted">
        Full transaction history view ports over next.
      </Text>
    </View>
  );
}
