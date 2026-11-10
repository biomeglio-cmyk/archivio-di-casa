import {
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme } from 'react-native';

import { SplashOverlay } from '@/components/splash-overlay';
import { FONTS } from '@/constants/brand';
import { DATABASE_NAME, initDatabase } from '@/db/init';
import { AppNotifications } from '@/notifications/app-notifications';

// The root Stack starts on the tabs; sheets and modals are pushed on top of them
export const unstable_settings = { anchor: '(tabs)' };

SplashScreen.preventAutoHideAsync();

// Root Stack: it holds the tab bar and the screens that slide up above the tabs.
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

  // SQLiteProvider opens the database, runs initDatabase (pragmas, migrations, files folder)
  // and only then renders its children, so every screen finds the database ready.
  return (
    <SQLiteProvider
      databaseName={DATABASE_NAME}
      onInit={initDatabase}
      options={{ enableChangeListener: true }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {/* Reminders: scheduled at start, tapping one opens its document */}
        <AppNotifications />
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
            name="settings"
            options={{
              presentation: 'modal',
              title: 'Impostazioni',
              headerTitleStyle: { fontFamily: FONTS.titleSemiBold },
            }}
          />
          <Stack.Screen
            name="onboarding"
            options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'fade' }}
          />
          <Stack.Screen
            name="send"
            options={{
              presentation: 'formSheet',
              headerShown: false,
              sheetGrabberVisible: true,
              sheetAllowedDetents: [0.85, 1.0],
            }}
          />
          <Stack.Screen
            name="calendar-settings"
            options={{
              presentation: 'formSheet',
              headerShown: false,
              sheetGrabberVisible: true,
              sheetAllowedDetents: [0.75, 1.0],
            }}
          />
          <Stack.Screen
            name="category-form"
            options={{
              presentation: 'formSheet',
              headerShown: false,
              sheetGrabberVisible: true,
              sheetAllowedDetents: [0.9],
            }}
          />
          <Stack.Screen
            name="person-form"
            options={{
              presentation: 'formSheet',
              headerShown: false,
              sheetGrabberVisible: true,
              sheetAllowedDetents: 'fitToContents',
            }}
          />
          <Stack.Screen
            name="capture"
            options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="edit-document/[id]"
            options={{
              presentation: 'modal',
              title: 'Modifica documento',
              headerTitleStyle: { fontFamily: FONTS.titleSemiBold },
            }}
          />
          <Stack.Screen
            name="new-document"
            options={{
              presentation: 'modal',
              title: 'Nuovo documento',
              headerTitleStyle: { fontFamily: FONTS.titleSemiBold },
            }}
          />
        </Stack>
        {/* After the Stack, so it is drawn on top of the first screen while it fades */}
        <SplashOverlay />
      </ThemeProvider>
    </SQLiteProvider>
  );
}
