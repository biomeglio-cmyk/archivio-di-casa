import { Stack } from 'expo-router/stack';

import { TAB_STACK_SCREEN_OPTIONS } from '@/constants/navigation';

// Stack of the "Scadenze" tab: list → document
export default function DeadlinesLayout() {
  return (
    <Stack screenOptions={TAB_STACK_SCREEN_OPTIONS}>
      <Stack.Screen name="index" options={{ title: 'Scadenze' }} />
      <Stack.Screen name="document/[id]" options={{ headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
