import {
  Onest_400Regular,
  Onest_500Medium,
  Onest_600SemiBold,
  Onest_700Bold,
  useFonts,
} from '@expo-google-fonts/onest';
import { DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { Fragment } from 'react';
import { Appearance } from 'react-native';

import { useAppGeneration } from '@/backup/app-reload';
import { AppLock } from '@/components/app-lock';
import { SplashOverlay } from '@/components/splash-overlay';
import { FONTS } from '@/constants/typography';
import { Colors, Radius } from '@/constants/theme';
import { DATABASE_NAME, initDatabase } from '@/db/init';
import { AppNotifications } from '@/notifications/app-notifications';

// Navigation theme with the app page color (white) behind every screen
const LIGHT_THEME = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: Colors.light.background, card: Colors.light.surface } };

// The root Stack starts on the tabs; sheets and modals are pushed on top of them
export const unstable_settings = { anchor: '(tabs)' };

SplashScreen.preventAutoHideAsync();

// Light mode only, even when the iPhone is in dark mode: app.json says "light", and this also
// forces the native parts (tab bar, sheets, alerts, pickers) where app.json is not applied (Expo Go)
Appearance.setColorScheme('light');

// Root Stack: it holds the tab bar and the screens that slide up above the tabs.
export default function RootLayout() {
  // Changes after "Ripristina backup": every screen is rebuilt from the restored data
  const generation = useAppGeneration();

  // Load Onest at runtime (no config plugin, so it works in Expo Go).
  // The keys become the fontFamily names listed in constants/typography.ts.
  const [fontsLoaded, fontError] = useFonts({
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    Onest_700Bold,
  });

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
      <ThemeProvider value={LIGHT_THEME}>
        <Fragment key={generation}>
        {/* Dark clock and battery on the light screens */}
        <StatusBar style="dark" />
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
              sheetCornerRadius: Radius.sheet,
              sheetAllowedDetents: 'fitToContents',
            }}
          />
          {/* Side menu from ≡ in Home: transparent, it draws its own dimmed background and slides
              its panel in from the left (src/app/menu.tsx) */}
          <Stack.Screen
            name="menu"
            options={{
              presentation: 'transparentModal',
              animation: 'none',
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
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
              sheetCornerRadius: Radius.sheet,
              sheetAllowedDetents: [0.85, 1.0],
            }}
          />
          <Stack.Screen
            name="calendar-settings"
            options={{
              presentation: 'formSheet',
              headerShown: false,
              sheetGrabberVisible: true,
              sheetCornerRadius: Radius.sheet,
              sheetAllowedDetents: [0.75, 1.0],
            }}
          />
          <Stack.Screen
            name="category-form"
            options={{
              presentation: 'formSheet',
              headerShown: false,
              sheetGrabberVisible: true,
              sheetCornerRadius: Radius.sheet,
              sheetAllowedDetents: [0.9],
            }}
          />
          <Stack.Screen
            name="person-form"
            options={{
              presentation: 'formSheet',
              headerShown: false,
              sheetGrabberVisible: true,
              sheetCornerRadius: Radius.sheet,
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
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          {/* "Aggiungi pagine" in the document detail: the pages editor of "Nuovo documento" */}
          <Stack.Screen
            name="document-pages/[id]"
            options={{
              presentation: 'modal',
              title: 'Pagine',
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          {/* "Scadenza" in the detail of every document: add, change or remove the deadline */}
          <Stack.Screen
            name="deadline/[id]"
            options={{
              presentation: 'modal',
              title: 'Scadenza',
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          {/* "Rinnovato" in the detail of a document with a deadline */}
          <Stack.Screen
            name="renew/[id]"
            options={{
              presentation: 'modal',
              title: 'Rinnovato',
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          <Stack.Screen
            name="document-version/[id]"
            options={{
              presentation: 'modal',
              title: 'Versione precedente',
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          <Stack.Screen
            name="new-document"
            options={{
              presentation: 'modal',
              title: 'Nuovo documento',
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          {/* Opened from the Menu */}
          <Stack.Screen
            name="notification-settings"
            options={{
              presentation: 'modal',
              title: 'Notifiche',
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          <Stack.Screen
            name="appearance"
            options={{
              presentation: 'modal',
              title: 'Aspetto',
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          <Stack.Screen
            name="backup"
            options={{
              presentation: 'modal',
              title: 'Backup',
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          {/* "Prepara per il commercialista" in the "…" menu of Spese 730 */}
          <Stack.Screen
            name="tax-package"
            options={{
              presentation: 'modal',
              title: 'Per il commercialista',
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          <Stack.Screen
            name="trash"
            options={{
              presentation: 'modal',
              title: 'Cestino',
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          {/* "Sblocca": the free version and the one-time purchase (its own × at the top) */}
          <Stack.Screen name="unlock" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen
            name="terms"
            options={{
              presentation: 'modal',
              title: 'Termini d’uso',
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          <Stack.Screen
            name="about"
            options={{
              presentation: 'modal',
              title: 'Info e privacy',
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          {/* Cards: camera (front + barcode), then the card form */}
          <Stack.Screen
            name="add-card"
            options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="new-card"
            options={{
              presentation: 'modal',
              title: 'Nuova carta',
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          <Stack.Screen
            name="edit-card/[id]"
            options={{
              presentation: 'modal',
              title: 'Modifica carta',
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          {/* "Modifica" of the Preferiti section: reorder and remove pinned items */}
          <Stack.Screen
            name="pinned-edit"
            options={{
              presentation: 'modal',
              title: 'Preferiti',
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
        </Stack>
        </Fragment>
        {/* After the Stack, so it is drawn on top of the first screen while it fades */}
        <SplashOverlay />
        {/* "Blocca con Face ID": above everything, even the open sheets and modals */}
        <AppLock />
      </ThemeProvider>
    </SQLiteProvider>
  );
}
