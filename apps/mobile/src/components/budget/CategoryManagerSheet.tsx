import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { X, Trash, ArrowCounterClockwise } from 'phosphor-react-native';
import { CATEGORIES, isHideableCategory } from '@ledgeit/core';
import { useStore } from '@/lib/store';
import { getIconComponent, getIconBg } from '@/lib/iconMap';

interface Props {
  open: boolean;
  onClose: () => void;
}

// Hideable presets, in declaration order. Structural ones (income, transfers,
// debts, other) are excluded — they're load-bearing and can't be removed.
const HIDEABLE_PRESETS = CATEGORIES.filter((c) => isHideableCategory(c.id));

/**
 * Manage which categories appear across the app. Preset categories can be
 * hidden (reversibly) — historical transactions keep their data and just show
 * as "Other". Custom categories are deleted outright. Ported from the web
 * CategoryManagerSheet into the mobile gorhom bottom-sheet idiom.
 */
export default function CategoryManagerSheet({ open, onClose }: Props) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['85%'], []);

  const hiddenCategories = useStore((s) => s.hiddenCategories);
  const customCategories = useStore((s) => s.customCategories);
  const hidePresetCategory = useStore((s) => s.hidePresetCategory);
  const unhidePresetCategory = useStore((s) => s.unhidePresetCategory);
  const removeCustomCategory = useStore((s) => s.removeCustomCategory);

  // Two-step confirm for the destructive custom-category delete.
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      sheetRef.current?.expand();
      setConfirmDelete(null);
    } else {
      sheetRef.current?.close();
    }
  }, [open]);

  function handleCustomDelete(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    removeCustomCategory(id);
    setConfirmDelete(null);
  }

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
          Manage Categories
        </Text>
        <Pressable onPress={onClose} hitSlop={8} className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
          <X size={14} weight="bold" color="#3f4946" />
        </Pressable>
      </View>

      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32 }}>
        <Text className="mb-3 text-[12px] leading-relaxed" style={{ color: '#6e9990' }}>
          Hide categories you don't use to declutter your pickers and budget. Past entries keep their data and reappear
          if you restore the category. Restore anytime.
        </Text>

        {/* Custom categories (deletable) */}
        {customCategories.length > 0 && (
          <>
            <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
              Your Categories
            </Text>
            <View className="mb-4 gap-2">
              {customCategories.map((c) => {
                const pending = confirmDelete === c.id;
                const Icon = getIconComponent(c.icon);
                const hex = getIconBg({ id: c.id, color: c.textColor });
                return (
                  <View
                    key={c.id}
                    className="flex-row items-center gap-3 rounded-xl px-4 py-2.5"
                    style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7edeb' }}
                  >
                    <View className="h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#e7edeb' }}>
                      <Icon size={15} weight="duotone" color={hex} />
                    </View>
                    <Text className="min-w-0 flex-1 text-sm font-semibold" style={{ color: '#191c1c' }} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Pressable
                      onPress={() => handleCustomDelete(c.id)}
                      hitSlop={8}
                      className="h-8 flex-row items-center gap-1 rounded-full px-3"
                      style={{ backgroundColor: pending ? '#ba1a1a' : '#f0f4f2' }}
                    >
                      <Trash size={12} weight="bold" color={pending ? '#fff' : '#ba1a1a'} />
                      <Text className="text-[11px] font-bold" style={{ color: pending ? '#fff' : '#ba1a1a' }}>
                        {pending ? 'Confirm' : 'Delete'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Preset categories (hideable) */}
        <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
          Default Categories
        </Text>
        <View className="gap-2">
          {HIDEABLE_PRESETS.map((c) => {
            const hidden = hiddenCategories.includes(c.id);
            const Icon = getIconComponent(c.icon);
            const hex = getIconBg({ id: c.id, color: c.color });
            return (
              <View
                key={c.id}
                className="flex-row items-center gap-3 rounded-xl px-4 py-2.5"
                style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e7edeb', opacity: hidden ? 0.55 : 1 }}
              >
                <View className="h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: '#e7edeb' }}>
                  <Icon size={15} weight="duotone" color={hex} />
                </View>
                <View className="min-w-0 flex-1 flex-row items-center gap-2">
                  <Text className="text-sm font-semibold" style={{ color: '#191c1c' }} numberOfLines={1}>
                    {c.label}
                  </Text>
                  {hidden && (
                    <Text className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#6e9990' }}>
                      Hidden
                    </Text>
                  )}
                </View>
                {hidden ? (
                  <Pressable
                    onPress={() => unhidePresetCategory(c.id)}
                    hitSlop={8}
                    className="h-8 flex-row items-center gap-1 rounded-full px-3"
                    style={{ backgroundColor: '#e7edeb' }}
                  >
                    <ArrowCounterClockwise size={12} weight="bold" color="#1f695d" />
                    <Text className="text-[11px] font-bold" style={{ color: '#1f695d' }}>
                      Restore
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => hidePresetCategory(c.id)}
                    hitSlop={8}
                    className="h-8 flex-row items-center gap-1 rounded-full px-3"
                    style={{ backgroundColor: '#f0f4f2' }}
                  >
                    <Trash size={12} weight="bold" color="#ba1a1a" />
                    <Text className="text-[11px] font-bold" style={{ color: '#ba1a1a' }}>
                      Delete
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
