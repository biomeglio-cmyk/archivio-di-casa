import { Stack } from 'expo-router/stack';

import { TAB_STACK_SCREEN_OPTIONS } from '@/constants/navigation';
import { useI18n } from '@/i18n';

// The favorites grid is the first screen of this stack
export const unstable_settings = { anchor: 'favorites' };

// Stack of the "Preferiti" tab: favorites grid → document
export default function FavoritesLayout() {
  const { t } = useI18n();
  return (
    <Stack screenOptions={TAB_STACK_SCREEN_OPTIONS}>
      {/* No navigation bar: the screen draws its own header. The title still names the back button. */}
      <Stack.Screen name="favorites" options={{ title: t('navigation.favorites'), headerShown: false }} />
      <Stack.Screen name="document/[id]" options={{ headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
