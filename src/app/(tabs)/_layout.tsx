import { NativeTabs } from 'expo-router/native-tabs';

import { BRAND_COLOR } from '@/constants/brand';

// Native iOS tab bar. Each trigger name matches a route (or route group) in this folder.
export default function TabsLayout() {
  return (
    <NativeTabs tintColor={BRAND_COLOR}>
      <NativeTabs.Trigger name="(deadlines)">
        <NativeTabs.Trigger.Icon sf="calendar" md="event" />
        <NativeTabs.Trigger.Label>Scadenze</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(archive)">
        <NativeTabs.Trigger.Icon sf={{ default: 'archivebox', selected: 'archivebox.fill' }} md="inventory_2" />
        <NativeTabs.Trigger.Label>Archivio</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="add">
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
