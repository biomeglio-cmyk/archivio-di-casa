import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';

import { Colors } from '@/constants/theme';
import { countUrgentDeadlines } from '@/db/urgent-count';
import { useDbQuery } from '@/hooks/use-db-query';
import { useFreeLimit, whenBelowLimit } from '@/settings/free-limit';

// Home is the tab the app starts on, at every launch and for every deep link into the tabs
export const unstable_settings = { anchor: '(archive)' };

// Native iOS tab bar (Liquid Glass on iOS 26): icons only, no labels. Each label is still set
// (hidden) and every tab has an accessibilityLabel, so VoiceOver reads "Home", "Scadenze"…
// Each trigger name matches a route (or route group) in this folder.
// Home is first and owns "/" (its index.tsx), so the app opens there.
export default function TabsLayout() {
  // Deadlines to check: overdue + due within 7 days (the same number as the Menu and the app icon;
  // the Home bell counts unread notifications instead). Kept live by the database change listener.
  const { data } = useDbQuery(countUrgentDeadlines, []);
  const urgent = data ?? 0;
  // At the free limit the "+" is grey with a lock and opens the limit panel (docs/design/HomeLimite.dc.html)
  const { reached } = useFreeLimit();

  return (
    <NativeTabs tintColor={Colors.light.indigo} badgeBackgroundColor={Colors.light.badge}>
      <NativeTabs.Trigger name="(archive)" accessibilityLabel="Home">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label hidden>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(favorites)" accessibilityLabel="Preferiti">
        <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} md="favorite" />
        <NativeTabs.Trigger.Label hidden>Preferiti</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="(deadlines)"
        accessibilityLabel={urgent > 0 ? `Scadenze, ${urgent} da controllare` : 'Scadenze'}>
        <NativeTabs.Trigger.Icon sf="calendar" md="event" />
        <NativeTabs.Trigger.Label hidden>Scadenze</NativeTabs.Trigger.Label>
        {/* Not rendered at all when 0: a hidden badge could still show "0" */}
        {urgent > 0 && <NativeTabs.Trigger.Badge>{String(urgent)}</NativeTabs.Trigger.Badge>}
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
        accessibilityLabel={reached ? 'Aggiungi documento, bloccato: limite gratuito raggiunto' : 'Aggiungi un documento'}
        listeners={{ tabPress: () => whenBelowLimit(() => router.push('/add-document')) }}>
        {/* A blue circle with a white plus (assets/images/tab-add*.png), drawn with its own colors
            ("original"): the tab is never selected, so the tint would leave it black.
            At the limit: a grey circle with a lock (the unselected tab color) */}
        {reached ? (
          <NativeTabs.Trigger.Icon sf="lock.circle.fill" md="lock" />
        ) : (
          <NativeTabs.Trigger.Icon src={require('@/assets/images/tab-add.png')} renderingMode="original" md="add_circle" />
        )}
        <NativeTabs.Trigger.Label hidden>Aggiungi</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
