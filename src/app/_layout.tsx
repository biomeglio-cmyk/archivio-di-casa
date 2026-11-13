import { useI18n } from '@/i18n'; // first: the language is ready before any screen
import {
  Onest_400Regular,
  Onest_500Medium,
  Onest_600SemiBold,
  Onest_700Bold,
  useFonts,
} from '@expo-google-fonts/onest';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { Fragment, Profiler } from 'react';
import { StyleSheet } from 'react-native';

import { useAppGeneration } from '@/backup/app-reload';
import { AccessibilityProvider, useReduceMotion } from '@/a11y/accessibility';
import { ThemeProvider as AppThemeProvider } from '@/theme/theme-provider';
import { AppLock } from '@/components/app-lock';
import { onAppCommit } from '@/dev/render-warning';
import { SplashOverlay } from '@/components/splash-overlay';
import { FONTS } from '@/constants/typography';
import { Radius, type Palette } from '@/constants/theme';
import { DATABASE_NAME, initDatabase } from '@/db/init';
import { AppNotifications } from '@/notifications/app-notifications';
import { useTheme } from '@/hooks/use-theme';

// Navigation theme with the app page color behind every screen (the active palette)
function navigationTheme(p: Palette) {
  const base = p.isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: p.background,
      card: p.surface,
      text: p.text,
      border: p.separator,
      primary: p.accent,
    },
  };
}

// The root Stack starts on the tabs; sheets and modals are pushed on top of them
export const unstable_settings = { anchor: '(tabs)' };

SplashScreen.preventAutoHideAsync();


// Root Stack: it holds the tab bar and the screens that slide up above the tabs.
export default function RootLayout() {
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

  // The theme of the whole app (Impostazioni › Aspetto › Tema): switching re-renders in place
  return (
    // Development: a warning when the whole app commits more than 50 times a second (a render loop)
    <Profiler id="Sottomano" onRender={onAppCommit}>
      <AccessibilityProvider>
        <AppThemeProvider>
          <RootContent />
        </AppThemeProvider>
      </AccessibilityProvider>
    </Profiler>
  );
}

function RootContent() {
  const theme = useTheme();
  // Stack titles follow the language live
  const { t } = useI18n();
  // Changes after "Ripristina backup": every screen is rebuilt from the restored data
  const generation = useAppGeneration();
  // Riduci movimento: the full-screen sheets fade in instead of sliding up
  const slideUp = useReduceMotion() ? 'fade' : 'slide_from_bottom';

  // SQLiteProvider opens the database, runs initDatabase (pragmas, migrations, files folder)
  // and only then renders its children, so every screen finds the database ready.
  return (
    <SQLiteProvider
      databaseName={DATABASE_NAME}
      onInit={initDatabase}
      options={{ enableChangeListener: true }}>
      <ThemeProvider value={navigationTheme(theme)}>
        <Fragment key={generation}>
        {/* Clock and battery: dark on the light theme, light on the dark one */}
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        {/* Reminders: scheduled at start, tapping one opens its document */}
        <AppNotifications />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="add-document"
            options={{ presentation: 'fullScreenModal', headerShown: false, animation: slideUp }}
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
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="person-form"
            options={{ presentation: 'modal', headerShown: false }}
          />
          <Stack.Screen
            name="capture"
            options={{ presentation: 'fullScreenModal', headerShown: false, animation: slideUp }}
          />
          <Stack.Screen
            name="edit-document/[id]"
            options={{ presentation: 'fullScreenModal', headerShown: false, title: t('navigation.titles.editDocument') }}
          />
          {/* "Aggiungi pagine" in the document detail: the pages editor of "Nuovo documento" */}
          <Stack.Screen
            name="document-pages/[id]"
            options={{
              presentation: 'modal',
              title: t('navigation.titles.pages'),
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          {/* "Scadenza" in the detail of every document: add, change or remove the deadline */}
          <Stack.Screen
            name="deadline/[id]"
            options={{
              presentation: 'modal',
              title: t('navigation.titles.deadline'),
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          {/* "Rinnovato" in the detail of a document with a deadline */}
          <Stack.Screen
            name="renew/[id]"
            options={{
              presentation: 'modal',
              title: t('navigation.titles.renewed'),
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          <Stack.Screen
            name="document-version/[id]"
            options={{
              presentation: 'modal',
              title: t('navigation.titles.previousVersion'),
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          <Stack.Screen
            name="new-document"
            options={{ presentation: 'fullScreenModal', headerShown: false, title: t('navigation.titles.newDocument') }}
          />
          {/* "Impostazioni" from the side menu: a full page with its own back button */}
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen
            name="appearance"
            options={{
              presentation: 'modal',
              title: t('navigation.titles.appearance'),
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          {/* "Lingua" from Impostazioni › Aspetto: the searchable list of languages */}
          <Stack.Screen
            name="language"
            options={{
              presentation: 'modal',
              title: t('language.title'),
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          <Stack.Screen
            name="backup"
            options={{ presentation: 'modal', title: t('navigation.titles.backup'), headerShown: false }}
          />
          {/* "Invia al commercialista": button and "…" menu of Spese 730 */}
          <Stack.Screen
            name="tax-package"
            options={{
              presentation: 'modal',
              title: t('navigation.titles.taxPackage'),
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          <Stack.Screen
            name="trash"
            options={{
              presentation: 'modal',
              title: t('navigation.titles.trash'),
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          {/* "Visualizza": the pages on a dark background, full screen */}
          <Stack.Screen name="view/[id]" options={{ presentation: 'fullScreenModal', headerShown: false }} />
          {/* Delete confirmations of the design: transparent, they draw their own dimmed background */}
          <Stack.Screen
            name="delete-document/[id]"
            options={{ presentation: 'transparentModal', animation: 'fade', headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}
          />
          <Stack.Screen
            name="delete-category/[id]"
            options={{ presentation: 'transparentModal', animation: 'fade', headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}
          />
          <Stack.Screen
            name="delete-person/[id]"
            options={{ presentation: 'transparentModal', animation: 'fade', headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}
          />
          {/* Free limit reached: "Hai usato i 7 spazi gratuiti" (Sblocca / Più tardi) */}
          <Stack.Screen
            name="limit"
            options={{ presentation: 'transparentModal', animation: 'none', headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}
          />
          {/* "Notifiche": the panel over Home opened by the bell */}
          <Stack.Screen
            name="notifications"
            options={{ presentation: 'transparentModal', animation: 'none', headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}
          />
          {/* "Sblocca": the free version and the one-time purchase (its own × at the top) */}
          <Stack.Screen name="unlock" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen
            name="terms"
            options={{
              presentation: 'modal',
              title: t('navigation.titles.terms'),
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          <Stack.Screen
            name="about"
            options={{
              presentation: 'modal',
              title: t('navigation.titles.about'),
              headerTitleStyle: { fontFamily: FONTS.semiBold },
            }}
          />
          {/* Cards: camera (front + barcode), then the card form */}
          <Stack.Screen
            name="add-card"
            options={{ presentation: 'fullScreenModal', headerShown: false, animation: slideUp }}
          />
          <Stack.Screen
            name="new-card"
            options={{ presentation: 'fullScreenModal', headerShown: false, title: t('navigation.titles.newCard') }}
          />
          <Stack.Screen
            name="edit-card/[id]"
            options={{ presentation: 'fullScreenModal', headerShown: false, title: t('navigation.titles.editCard') }}
          />
        </Stack>
        </Fragment>
        {/* Tema notte (v2): a soft indigo light at the top of every screen (decorative, no touches) */}
        {theme.glow && (
          <LinearGradient
            colors={[theme.glow, 'rgba(98, 104, 255, 0)']}
            style={styles.glow}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        )}
        {/* After the Stack, so it is drawn on top of the first screen while it fades */}
        <SplashOverlay />
        {/* "Blocca con Face ID": above everything, even the open sheets and modals */}
        <AppLock />
      </ThemeProvider>
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
});
