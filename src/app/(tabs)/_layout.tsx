import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';

import { BRAND_COLOR } from '@/constants/brand';
import { countUrgentDeadlines } from '@/db/urgent-count';
import { useDbQuery } from '@/hooks/use-db-query';

// Home is the tab the app starts on, at every launch and for every deep link into the tabs
export const unstable_settings = { anchor: '(archive)' };

// Native iOS tab bar (Liquid Glass on iOS 26): icons only, no labels. Each label is still set
// (hidden) and every tab has an accessibilityLabel, so VoiceOver reads "Home", "Scadenze"…
// Each trigger name matches a route (or route group) in this folder.
// Home is first and owns "/" (its index.tsx), so the app opens there.
export default function TabsLayout() {
  // Overdue + within 7 days, kept live by the database change listener
  const { data: urgent } = useDbQuery(countUrgentDeadlines, []);

  return (
    <NativeTabs tintColor={BRAND_COLOR}>
      <NativeTabs.Trigger name="(archive)" accessibilityLabel="Home">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label hidden>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="(deadlines)"
        accessibilityLabel={urgent ? `Scadenze, ${urgent} da controllare` : 'Scadenze'}>
        <NativeTabs.Trigger.Icon sf="calendar" md="event" />
        <NativeTabs.Trigger.Label hidden>Scadenze</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={!urgent}>{String(urgent ?? 0)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(favorites)" accessibilityLabel="Preferiti">
        <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} md="favorite" />
        <NativeTabs.Trigger.Label hidden>Preferiti</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(family)" accessibilityLabel="Famiglia">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="group" />
        <NativeTabs.Trigger.Label hidden>Famiglia</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      {/* "+" tab: disabled, so it is never selected. The press event still arrives,
          and we use it to open the "Aggiungi un documento" sheet instead. */}
      <NativeTabs.Trigger
        name="add"
        disabled
        accessibilityLabel="Aggiungi un documento"
        listeners={{ tabPress: () => router.push('/add-document') }}>
        <NativeTabs.Trigger.Icon sf="plus.circle.fill" md="add_circle" />
        <NativeTabs.Trigger.Label hidden>Aggiungi</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
