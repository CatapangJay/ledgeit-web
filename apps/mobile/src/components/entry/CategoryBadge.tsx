import { View, Text } from 'react-native';
import type { Category } from '@ledgeit/core';
import { getIconComponent, getIconBg } from '@/lib/iconMap';

interface Props {
  category: Category;
  size?: 'sm' | 'md' | 'lg';
}

// Mirrors the web CategoryBadge sizing. On mobile we can't rely on arbitrary
// Tailwind color classes, so the pill derives its hue from getIconBg (a hex
// swatch) — tinted background + solid text/icon, matching the mobile idiom.
const SIZES = {
  sm: { icon: 11, paddingH: 8, paddingV: 2, gap: 4, font: 11 },
  md: { icon: 13, paddingH: 10, paddingV: 4, gap: 6, font: 12 },
  lg: { icon: 16, paddingH: 12, paddingV: 6, gap: 8, font: 14 },
};

export default function CategoryBadge({ category, size = 'md' }: Props) {
  const Icon = getIconComponent(category.icon);
  const hex = getIconBg({ id: category.id, color: category.color });
  const s = SIZES[size];

  return (
    <View
      className="flex-row items-center self-start rounded-full"
      style={{
        backgroundColor: `${hex}1a`,
        paddingHorizontal: s.paddingH,
        paddingVertical: s.paddingV,
        gap: s.gap,
      }}
    >
      {Icon && <Icon size={s.icon} weight="fill" color={hex} />}
      <Text className="font-medium" style={{ fontSize: s.font, color: hex }}>
        {category.label}
      </Text>
    </View>
  );
}
