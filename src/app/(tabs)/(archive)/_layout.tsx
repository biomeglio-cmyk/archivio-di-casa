import { Stack } from 'expo-router/stack';

import { TAB_STACK_SCREEN_OPTIONS } from '@/constants/navigation';

// The grid is the first screen of this stack (also under a category or document opened by a link)
export const unstable_settings = { anchor: 'index' };

// Stack of the "Home" tab (route group still named "archive"): categories grid → category → document
export default function ArchiveLayout() {
  return (
    <Stack screenOptions={TAB_STACK_SCREEN_OPTIONS}>
      {/* No navigation bar: the screen draws its own brand header. The title still names the back button. */}
      <Stack.Screen name="index" options={{ title: 'Home', headerShown: false }} />
      <Stack.Screen name="search" options={{ title: 'Cerca', headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="category/[id]" />
      <Stack.Screen name="document/[id]" options={{ headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
