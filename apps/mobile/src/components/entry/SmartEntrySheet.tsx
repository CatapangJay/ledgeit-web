import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useEffect, useMemo, useRef } from 'react';
import { Text, View } from 'react-native';

interface SmartEntrySheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Placeholder for the native Smart Entry sheet. Mirrors the web
 * SmartEntrySheet's role (quick free-text transaction entry) — full parsing
 * UI ports over in a later phase.
 */
export default function SmartEntrySheet({ open, onClose }: SmartEntrySheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%'], []);

  useEffect(() => {
    if (open) {
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [open]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}
      backgroundStyle={{ backgroundColor: '#f8faf9' }}
      handleIndicatorStyle={{ backgroundColor: '#cde0db' }}
    >
      <BottomSheetView className="flex-1 items-center px-6 pt-2">
        <Text className="text-lg font-bold" style={{ color: '#00352e' }}>
          Log a transaction
        </Text>
        <Text className="mt-2 text-center text-sm" style={{ color: '#6e9990' }}>
          Smart entry parsing is coming soon on mobile. Use the web app for now.
        </Text>
      </BottomSheetView>
    </BottomSheet>
  );
}
