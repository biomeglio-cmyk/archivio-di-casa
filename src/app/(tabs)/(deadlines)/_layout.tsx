import { Stack } from 'expo-router/stack';

import { TAB_STACK_SCREEN_OPTIONS } from '@/constants/navigation';

// The calendar is the first screen of this stack
export const unstable_settings = { anchor: 'deadlines' };

// Stack of the "Scadenze" tab: list → document
export default function DeadlinesLayout() {
  return (
    <Stack screenOptions={TAB_STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="deadlines" options={{ title: 'Scadenze' }} />
      <Stack.Screen name="document/[id]" options={{ headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
