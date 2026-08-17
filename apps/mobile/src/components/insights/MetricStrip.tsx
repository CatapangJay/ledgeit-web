import { View, Text } from 'react-native';

interface Metric {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

interface Props {
  metrics: Metric[];
}

export default function MetricStrip({ metrics }: Props) {
  return (
    <View className="flex-row overflow-hidden rounded-2xl py-4" style={{ backgroundColor: '#ffffff', shadowColor: '#00352e', shadowOpacity: 0.06, shadowRadius: 12, elevation: 1 }}>
      {metrics.map((m, i) => (
        <View
          key={m.label}
          className="flex-1 gap-1 px-4"
          style={i > 0 ? { borderLeftWidth: 1, borderLeftColor: '#e7edeb' } : undefined}
        >
          <Text className="text-[10px] font-bold uppercase tracking-[1.4px]" style={{ color: '#6e9990' }}>
            {m.label}
          </Text>
          <Text className="font-mono text-base font-bold leading-none" style={{ color: m.color ?? '#191c1c' }}>
            {m.value}
          </Text>
          {m.sub && (
            <Text className="text-[10px] font-medium" style={{ color: '#6e9990' }}>
              {m.sub}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
