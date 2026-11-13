import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';


import { countUrgentDeadlines } from '@/db/urgent-count';
import { useDbQuery } from '@/hooks/use-db-query';
import { useI18n } from '@/i18n';
import { useFreeLimit, whenBelowLimit } from '@/settings/free-limit';
import { useTheme } from '@/hooks/use-theme';

// Home is the tab the app starts on, at every launch and for every deep link into the tabs
export const unstable_settings = { anchor: '(archive)' };

// Native iOS tab bar (Liquid Glass on iOS 26): icons only, no labels. Each label is still set
// (hidden) and every tab has an accessibilityLabel, so VoiceOver reads "Home", "Scadenze"…
// Each trigger name matches a route (or route group) in this folder.
// Home is first and owns "/" (its index.tsx), so the app opens there.
export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useI18n();
  // Deadlines to check: overdue + due within 7 days (the same number as the Menu and the app icon;
  // the Home bell counts unread notifications instead). Kept live by the database change listener.
  const { data } = useDbQuery(countUrgentDeadlines, []);
  const urgent = data ?? 0;
  // At the free limit the "+" is grey with a lock and opens the limit panel (docs/design/HomeLimite.dc.html)
  const { reached } = useFreeLimit();

  return (
    <NativeTabs tintColor={theme.indigo} badgeBackgroundColor={theme.badge}>
      <NativeTabs.Trigger name="(archive)" accessibilityLabel={t('navigation.home')}>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label hidden>{t('navigation.home')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(favorites)" accessibilityLabel={t('navigation.favorites')}>
        <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} md="favorite" />
        <NativeTabs.Trigger.Label hidden>{t('navigation.favorites')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="(deadlines)"
        accessibilityLabel={urgent > 0 ? t('navigation.deadlinesToCheck', { count: urgent }) : t('navigation.deadlines')}>
        <NativeTabs.Trigger.Icon sf="calendar" md="event" />
        <NativeTabs.Trigger.Label hidden>{t('navigation.deadlines')}</NativeTabs.Trigger.Label>
        {/* Not rendered at all when 0: a hidden badge could still show "0" */}
        {urgent > 0 && <NativeTabs.Trigger.Badge>{String(urgent)}</NativeTabs.Trigger.Badge>}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(family)" accessibilityLabel={t('navigation.family')}>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="group" />
        <NativeTabs.Trigger.Label hidden>{t('navigation.family')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      {/* "+" tab: disabled, so it is never selected. The press event still arrives,
          and we use it to open the "Aggiungi un documento" sheet instead. */}
      <NativeTabs.Trigger
        name="add"
        disabled
        accessibilityLabel={reached ? t('navigation.addLocked') : t('navigation.addDocument')}
        listeners={{ tabPress: () => whenBelowLimit(() => router.push('/add-document')) }}>
        {/* A blue circle with a white plus (assets/images/tab-add*.png), drawn with its own colors
            ("original"): the tab is never selected, so the tint would leave it black.
            At the limit: a grey circle with a lock (the unselected tab color) */}
        {reached ? (
          <NativeTabs.Trigger.Icon sf="lock.circle.fill" md="lock" />
        ) : (
          <NativeTabs.Trigger.Icon src={require('@/assets/images/tab-add.png')} renderingMode="original" md="add_circle" />
        )}
        <NativeTabs.Trigger.Label hidden>{t('common.add')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
