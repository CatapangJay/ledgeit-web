import type { BottomTabBarProps } from 'expo-router/tabs';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChartPieSlice,
  House,
  List,
  PlusCircle,
  UserCircle,
  type Icon,
} from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import SmartEntrySheet from '@/components/entry/SmartEntrySheet';

const MUTED = '#6e9990';
const ACCENT = '#00352e';

const SPRING = { stiffness: 400, damping: 20 };

type TabItem = {
  key: string;
  label: string;
  icon: Icon;
};

const TABS: TabItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: House },
  { key: 'ledger', label: 'Ledger', icon: List },
  { key: 'insights', label: 'Insights', icon: ChartPieSlice },
  { key: 'account', label: 'Account', icon: UserCircle },
];

function AnimatedTabButton({
  item,
  isActive,
  onPress,
}: {
  item: TabItem;
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: isActive }}
      onPressIn={() => {
        scale.value = withSpring(0.92, SPRING);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING);
      }}
      onPress={onPress}
      className="relative flex-1 items-center justify-center gap-1 py-3"
    >
      <Animated.View style={animatedStyle} className="items-center gap-1">
        <item.icon
          size={20}
          weight={isActive ? 'fill' : 'regular'}
          color={isActive ? ACCENT : MUTED}
        />
        <Text
          className="text-[10px] font-semibold tracking-wide"
          style={{ color: isActive ? ACCENT : MUTED }}
        >
          {item.label}
        </Text>
      </Animated.View>
      {isActive && (
        <View
          className="absolute bottom-0 left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-full"
          style={{ backgroundColor: ACCENT }}
        />
      )}
    </Pressable>
  );
}

function FabButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View className="relative flex-1 items-center" style={{ marginBottom: -1 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log transaction"
        onPressIn={() => {
          scale.value = withSpring(0.88, SPRING);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, SPRING);
        }}
        onPress={onPress}
        className="items-center justify-center pb-2 pt-1"
      >
        <Animated.View style={animatedStyle}>
          <LinearGradient
            colors={['#1f695d', '#00352e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 9999,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ translateY: -10 }],
              shadowColor: '#00352e',
              shadowOpacity: 0.35,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            <PlusCircle size={22} weight="bold" color="#ffffff" />
          </LinearGradient>
        </Animated.View>
        <Text
          className="text-[10px] font-semibold tracking-wide"
          style={{ color: MUTED, marginTop: -4 }}
        >
          Add
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Native equivalent of apps/web's BottomNav.tsx — mirrors the 5-slot layout
 * (Dashboard, Ledger, FAB Add, Insights, Account) and design tokens exactly.
 */
export default function BottomNav({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeRouteName = state.routes[state.index]?.name;

  const goTo = (key: string) => {
    const route = state.routes.find((r) => r.name === key);
    if (route) {
      navigation.navigate(route.name);
    }
  };

  const leftTabs = TABS.slice(0, 2);
  const rightTabs = TABS.slice(2);

  return (
    <>
      <View
        className="flex-row items-end justify-around border-t px-2"
        style={{
          paddingBottom: insets.bottom,
          backgroundColor: 'rgba(248,250,249,0.92)',
          borderTopColor: 'rgba(205,224,219,0.6)',
        }}
      >
        {leftTabs.map((tab) => (
          <AnimatedTabButton
            key={tab.key}
            item={tab}
            isActive={activeRouteName === tab.key}
            onPress={() => goTo(tab.key)}
          />
        ))}

        <FabButton onPress={() => setSheetOpen(true)} />

        {rightTabs.map((tab) => (
          <AnimatedTabButton
            key={tab.key}
            item={tab}
            isActive={activeRouteName === tab.key}
            onPress={() => goTo(tab.key)}
          />
        ))}
      </View>

      <SmartEntrySheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
