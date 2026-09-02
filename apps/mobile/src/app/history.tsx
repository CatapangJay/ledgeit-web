import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { CaretLeft, ClockCounterClockwise } from 'phosphor-react-native';

export default function HistoryScreen() {
  const router = useRouter();

  return (
    <View className="flex-1" style={{ backgroundColor: '#f8faf9' }}>
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
            History
          </Text>
          <Text className="text-[11px]" style={{ color: '#6e9990' }}>
            Your month-by-month spending record
          </Text>
        </View>
      </View>

      {/* Coming-soon empty state */}
      <View className="flex-1 items-center justify-center px-8">
        <View
          className="mb-4 h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: '#f0f4f2' }}
        >
          <ClockCounterClockwise size={30} weight="duotone" color="#6e9990" />
        </View>
        <Text className="mb-1.5 text-sm font-semibold" style={{ color: '#3f4946', textAlign: 'center' }}>
          Month history is on the way.
        </Text>
        <Text className="text-xs leading-relaxed" style={{ color: '#6e9990', textAlign: 'center' }}>
          Soon you'll be able to look back at past months and see how your spending changed over time.
        </Text>
      </View>
    </View>
  );
}
