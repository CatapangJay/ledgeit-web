import { useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { X } from 'phosphor-react-native';
import { CATEGORIES, type Category, type CustomCategory } from '@ledgeit/core';
import { getIconComponent } from '@/lib/iconMap';

interface Props {
  open: boolean;
  /** Title shown in the header, e.g. "Move 4 to…". */
  title: string;
  customCategories?: CustomCategory[];
  /** Preset ids to exclude (hidden categories). */
  hiddenCategories?: string[];
  onPick: (category: Category) => void;
  onClose: () => void;
}

/**
 * Bottom-sheet grid for picking a single category — used by the ledger's bulk
 * "change category" action and inline row category changes. Excludes Debts
 * (managed on the Debts screen) and any hidden presets; includes custom
 * categories. Mirrors the category grid in TransactionEditSheet.
 */
export default function CategoryPickerSheet({
  open,
  title,
  customCategories = [],
  hiddenCategories = [],
  onPick,
  onClose,
}: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['70%'], []);

  useEffect(() => {
    if (open) {
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [open]);

  const categories: Category[] = [
    ...CATEGORIES.filter((c) => c.id !== 'debts' && !hiddenCategories.includes(c.id)),
    ...customCategories.map((c) => ({
      id: c.id,
      label: c.name,
      icon: c.icon,
      color: c.textColor,
      bgColor: c.bgColor,
      keywords: [] as string[],
    })),
  ];

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />}
      backgroundStyle={{ backgroundColor: '#f8faf9' }}
      handleIndicatorStyle={{ backgroundColor: '#cde0db' }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pb-3" style={{ borderBottomWidth: 1, borderBottomColor: '#e7edeb' }}>
        <Text className="text-[15px] font-bold" style={{ color: '#00352e' }}>
          {title}
        </Text>
        <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
          <X size={14} weight="bold" color="#3f4946" />
        </Pressable>
      </View>

      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 24 }}>
        <View className="flex-row flex-wrap gap-1.5">
          {categories.map((cat) => {
            const Icon = getIconComponent(cat.icon);
            return (
              <Pressable
                key={cat.id}
                onPress={() => onPick(cat)}
                className="items-center gap-1 rounded-xl py-2"
                style={{ width: '31%', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7edeb' }}
              >
                <Icon size={16} weight="regular" color="#6e9990" />
                <Text className="text-[10px] font-medium leading-none" style={{ color: '#6e9990' }} numberOfLines={1}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
