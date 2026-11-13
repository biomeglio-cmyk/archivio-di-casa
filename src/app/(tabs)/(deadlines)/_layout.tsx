import { Stack } from 'expo-router/stack';

import { TAB_STACK_SCREEN_OPTIONS } from '@/constants/navigation';
import { useI18n } from '@/i18n';

// The calendar is the first screen of this stack
export const unstable_settings = { anchor: 'deadlines' };

// Stack of the "Scadenze" tab: list → document
export default function DeadlinesLayout() {
  const { t } = useI18n();
  return (
    <Stack screenOptions={TAB_STACK_SCREEN_OPTIONS}>
      {/* No navigation bar: the screen draws its own header (back, "+", title) as in the design.
          The title still names the back button of the document screen. */}
      <Stack.Screen name="deadlines" options={{ title: t('navigation.deadlines'), headerShown: false }} />
      <Stack.Screen name="document/[id]" options={{ headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
