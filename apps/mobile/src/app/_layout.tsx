import '../global.css';

import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  GeistMono_400Regular,
  GeistMono_700Bold,
  useFonts as useGeistMonoFonts,
} from '@expo-google-fonts/geist-mono';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [jakartaLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const [geistMonoLoaded] = useGeistMonoFonts({
    GeistMono_400Regular,
    GeistMono_700Bold,
  });
  const fontsLoaded = jakartaLoaded && geistMonoLoaded;

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="debts" options={{ headerShown: true, title: 'Debts' }} />
          <Stack.Screen name="history" options={{ headerShown: true, title: 'History' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
