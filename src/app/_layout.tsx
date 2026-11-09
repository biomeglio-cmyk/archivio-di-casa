import {
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

// Root Stack: it holds the tab bar and the two bottom sheets
// ("Aggiungi un documento" and "Invia") that slide up above the tabs.
export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Load Outfit at runtime (no config plugin, so it works in Expo Go).
  // The keys become the fontFamily names listed in constants/brand.ts.
  const [fontsLoaded, fontError] = useFonts({ Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold });

  // Keep the native splash screen visible until the fonts are ready.
  // On error we go on anyway: texts fall back to the system font.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-document"
          options={{
            presentation: 'formSheet',
            headerShown: false,
            sheetGrabberVisible: true,
            sheetAllowedDetents: 'fitToContents',
          }}
        />
        <Stack.Screen
          name="send-document/[id]"
          options={{
            presentation: 'formSheet',
            headerShown: false,
            sheetGrabberVisible: true,
            sheetAllowedDetents: 'fitToContents',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
