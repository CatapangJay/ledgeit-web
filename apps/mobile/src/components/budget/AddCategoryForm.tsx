import { useState, type ComponentType } from 'react';
import { View, Text, Pressable, TextInput, type TextInputProps } from 'react-native';
import { X } from 'phosphor-react-native';
import { CUSTOM_ICON_OPTIONS, CUSTOM_COLOR_OPTIONS, getIconComponent, type CustomColorOption } from '@/lib/iconMap';

interface Props {
  onConfirm: (name: string, icon: string, textColor: string, bgColor: string) => void | Promise<void>;
  onCancel: () => void;
  saving?: boolean;
  /**
   * Input component to render for the name field. Defaults to RN `TextInput`
   * (correct for the full-screen Onboarding use). Inside a gorhom bottom sheet,
   * pass `BottomSheetTextInput` so the keyboard/focus behaves correctly.
   */
  InputComponent?: ComponentType<TextInputProps>;
}

/**
 * Inline "new custom category" form: name + icon grid + color swatches. Ported
 * from the web AddCategoryForm. Colors come from CUSTOM_COLOR_OPTIONS (hex
 * swatch on mobile) but we still hand the caller the Tailwind textColor/bgColor
 * class strings the store persists, keeping data identical to web.
 */
export default function AddCategoryForm({ onConfirm, onCancel, saving, InputComponent = TextInput }: Props) {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(CUSTOM_ICON_OPTIONS[0]);
  const [selectedColor, setSelectedColor] = useState<CustomColorOption>(CUSTOM_COLOR_OPTIONS[0]);

  function handleConfirm() {
    if (!name.trim()) return;
    onConfirm(name.trim(), selectedIcon, selectedColor.textColor, selectedColor.bgColor);
  }

  const canConfirm = !!name.trim() && !saving;

  return (
    <View className="mt-3 rounded-2xl p-4" style={{ backgroundColor: '#e7edeb', borderWidth: 1.5, borderColor: '#cde0db' }}>
      {/* Header */}
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
          New Category
        </Text>
        <Pressable onPress={onCancel} className="h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: '#f0f4f2' }}>
          <X size={11} weight="bold" color="#6e9990" />
        </Pressable>
      </View>

      {/* Name input */}
      <InputComponent
        maxLength={32}
        value={name}
        onChangeText={setName}
        placeholder="E.g. Childcare, Hobbies…"
        placeholderTextColor="#6e9990"
        className="mb-3 rounded-xl px-3 py-2.5 text-sm font-semibold"
        style={{ backgroundColor: '#f8faf9', color: '#191c1c' }}
      />

      {/* Icon picker */}
      <Text className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
        Icon
      </Text>
      <View className="mb-3 flex-row flex-wrap">
        {CUSTOM_ICON_OPTIONS.map((iconName) => {
          const Icon = getIconComponent(iconName);
          const isSelected = selectedIcon === iconName;
          return (
            <View key={iconName} style={{ width: `${100 / 7}%` }} className="p-1">
              <Pressable
                onPress={() => setSelectedIcon(iconName)}
                className="aspect-square items-center justify-center rounded-xl"
                style={{ backgroundColor: isSelected ? '#1f695d' : '#f0f4f2' }}
              >
                <Icon size={16} weight={isSelected ? 'fill' : 'regular'} color={isSelected ? '#fff' : '#3f4946'} />
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Color picker */}
      <Text className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: '#6e9990' }}>
        Color
      </Text>
      <View className="mb-4 flex-row flex-wrap">
        {CUSTOM_COLOR_OPTIONS.map((opt) => {
          const isSelected = selectedColor.label === opt.label;
          return (
            <View key={opt.label} style={{ width: `${100 / 9}%` }} className="items-center p-1">
              <Pressable
                onPress={() => setSelectedColor(opt)}
                className="h-7 w-7 items-center justify-center rounded-full"
                style={{ backgroundColor: opt.swatch, borderWidth: isSelected ? 2 : 0, borderColor: '#00352e' }}
              />
            </View>
          );
        })}
      </View>

      {/* Actions */}
      <Pressable
        onPress={handleConfirm}
        disabled={!canConfirm}
        className="rounded-xl py-2.5 items-center"
        style={{ backgroundColor: '#1f695d', opacity: canConfirm ? 1 : 0.4 }}
      >
        <Text className="text-sm font-bold text-white">{saving ? 'Adding…' : 'Add Category'}</Text>
      </Pressable>
    </View>
  );
}
