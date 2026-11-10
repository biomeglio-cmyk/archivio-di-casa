import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';

import { BRAND_COLOR } from '@/constants/brand';
import { countUrgentDeadlines } from '@/db/urgent-count';
import { useDbQuery } from '@/hooks/use-db-query';

// Archivio is the tab the app starts on, at every launch and for every deep link into the tabs
export const unstable_settings = { anchor: '(archive)' };

// Native iOS tab bar. Each trigger name matches a route (or route group) in this folder.
// Archivio is first and owns "/" (its index.tsx), so the app opens there.
export default function TabsLayout() {
  // Overdue + within 7 days, kept live by the database change listener
  const { data: urgent } = useDbQuery(countUrgentDeadlines, []);

  return (
    <NativeTabs tintColor={BRAND_COLOR}>
      <NativeTabs.Trigger name="(archive)">
        <NativeTabs.Trigger.Icon sf={{ default: 'archivebox', selected: 'archivebox.fill' }} md="inventory_2" />
        <NativeTabs.Trigger.Label>Archivio</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(deadlines)">
        <NativeTabs.Trigger.Icon sf="calendar" md="event" />
        <NativeTabs.Trigger.Label>Scadenze</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge hidden={!urgent}>{String(urgent ?? 0)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>

      {/* "+" tab: disabled, so it is never selected. The press event still arrives,
          and we use it to open the "Aggiungi un documento" sheet instead. */}
      <NativeTabs.Trigger
        name="add"
        disabled
        listeners={{ tabPress: () => router.push('/add-document') }}>
        <NativeTabs.Trigger.Icon sf="plus.circle.fill" md="add_circle" />
        <NativeTabs.Trigger.Label>Aggiungi</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(family)">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="group" />
        <NativeTabs.Trigger.Label>Famiglia</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
