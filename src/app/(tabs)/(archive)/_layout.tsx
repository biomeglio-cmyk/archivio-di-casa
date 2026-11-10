import { Stack } from 'expo-router/stack';

import { TAB_STACK_SCREEN_OPTIONS } from '@/constants/navigation';

// Stack of the "Archivio" tab: categories grid → category → document
export default function ArchiveLayout() {
  return (
    <Stack screenOptions={TAB_STACK_SCREEN_OPTIONS}>
      {/* No navigation bar: the screen draws its own brand header. The title still names the back button. */}
      <Stack.Screen name="index" options={{ title: 'Archivio', headerShown: false }} />
      <Stack.Screen name="category/[id]" />
      <Stack.Screen name="document/[id]" options={{ headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
