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
import { StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { FONTS } from '@/constants/brand';
import { DATABASE_NAME, initDatabase } from '@/db/init';

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
  // GestureHandlerRootView: required by the swipe actions on list rows
  return (
    <GestureHandlerRootView style={styles.root}>
      <SQLiteProvider
        databaseName={DATABASE_NAME}
        onInit={initDatabase}
        options={{ enableChangeListener: true }}>
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
        </ThemeProvider>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
