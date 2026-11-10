import { Stack } from 'expo-router/stack';

import { TAB_STACK_SCREEN_OPTIONS } from '@/constants/navigation';

// The people grid is the first screen of this stack
export const unstable_settings = { anchor: 'family' };

// Stack of the "Famiglia" tab: people → person → document
export default function FamilyLayout() {
  return (
    <Stack screenOptions={TAB_STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="family" options={{ title: 'Famiglia' }} />
      <Stack.Screen name="person/[id]" />
      <Stack.Screen name="document/[id]" options={{ headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
