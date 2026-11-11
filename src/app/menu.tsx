import { Host, Switch } from '@expo/ui';
import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getCalendarSettings } from '@/calendar/calendar-settings';
import { addByScan, addFromFiles, addFromPhotos } from '@/capture/add-actions';
import { Group, Row } from '@/components/grouped-list';
import { ThemedText } from '@/components/themed-text';
import { FONTS } from '@/constants/brand';
import { getMenuCounts } from '@/db/menu-counts';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { disableAppLock, enableAppLock, useAppLockEnabled } from '@/security/app-lock';

// Sheet "Menu" (the ≡ in the Home header), at 90% of the screen: an iOS grouped list.
// Drag down, the X or a tap outside closes it. Every row closes it and goes somewhere:
// - a tab (Home, Scadenze, Famiglia): close the sheet, then navigate;
// - another sheet or modal (Notifiche, Preferiti…): the menu is REPLACED by it, so closing it
//   brings back to Home, not to the menu.
export default function MenuSheet() {
  const theme = useTheme();
  const { data: counts } = useDbQuery(getMenuCounts, []);
  const [calendarLabel] = useState(() => {
    const calendar = getCalendarSettings();
    return calendar.enabled && calendar.calendarTitle ? calendar.calendarTitle : 'Spento';
  });

  function goToTab(href: Href) {
    router.back();
    router.navigate(href);
  }

  const lockEnabled = useAppLockEnabled();

  async function toggleLock(value: boolean) {
    if (!value) {
      disableAppLock();
      return;
    }
    const result = await enableAppLock();
    if (result === 'no-passcode') {
      Alert.alert(
        'Blocco non disponibile',
        'Per bloccare Sottomano serve un codice sull\'iPhone. Impostalo in Impostazioni › Face ID e codice, poi riprova.',
      );
    }
  }

  const cardsId = counts?.cardsCategoryId;

  return (
    // ONE ScrollView is the whole sheet: a formSheet gives its root a height only through the
    // scroll view, so a View with a ScrollView inside can collapse to zero. The header is the
    // first child and stays pinned on top (stickyHeaderIndices), the sections scroll under it.
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      stickyHeaderIndices={[0]}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      contentContainerStyle={styles.content}>
      {/* Pinned header with the sheet background, so the rows never show through it.
          The system grabber is drawn by iOS in its top padding. */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.backgroundSelected }]}>
        <ThemedText style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={1.6}>
          Menu
        </ThemedText>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Chiudi"
          style={[styles.close, { backgroundColor: theme.backgroundSelected }]}>
          <SymbolView name="xmark" tintColor={theme.textSecondary} size={14} weight="bold" />
        </Pressable>
      </View>

      <View style={styles.sections}>
        <Group title="Documenti">
          <Row label="Home" symbol="square.grid.2x2" count={counts?.documents} first onPress={() => goToTab('/')} />
          <Row label="Preferiti" symbol="heart" count={counts?.pinned} onPress={() => router.replace('/pinned-edit')} />
          {cardsId != null && (
            <Row
              label="Tessere e card"
              symbol="creditcard"
              count={counts?.cards}
              onPress={() => goToTab({ pathname: '/category/[id]', params: { id: String(cardsId) } })}
            />
          )}
          <Row label="Scadenze" symbol="calendar" count={counts?.urgent} alert onPress={() => goToTab('/deadlines')} />
        </Group>

        <Group title="Famiglia">
          <Row label="Persone" symbol="person.2" count={counts?.people} first onPress={() => goToTab('/family')} />
        </Group>

        <Group title="Aggiungi">
          <Row label="Scansiona" symbol="doc.viewfinder" first onPress={addByScan} />
          <Row label="Dalle foto" symbol="photo.on.rectangle" onPress={addFromPhotos} />
          <Row label="Importa file" symbol="doc" onPress={addFromFiles} />
        </Group>

        <Group
          title="Impostazioni"
          footer="Per aprire Sottomano servirà il tuo viso o il codice dell'iPhone. Si blocca di nuovo dopo 1 minuto fuori dall'app.">
          <Row label="Notifiche" symbol="bell.badge" first onPress={() => router.replace('/notification-settings')} />
          <Row label="Calendario" symbol="calendar.badge.plus" value={calendarLabel} onPress={() => router.replace('/calendar-settings')} />
          <Row label="Backup" symbol="externaldrive.badge.icloud" onPress={() => router.replace('/backup')} />
          <Row label="Blocca con Face ID" symbol="faceid">
            <Host matchContents>
              <Switch value={lockEnabled} onValueChange={toggleLock} />
            </Host>
          </Row>
        </Group>

        <Group title="Altro">
          <Row label="Aiuto" symbol="questionmark.circle" first onPress={() => router.replace('/onboarding')} />
          <Row label="Info e privacy" symbol="info.circle" onPress={() => router.replace('/about')} />
        </Group>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 22, // room for the grabber
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    flexShrink: 1,
    fontSize: 28,
    lineHeight: 34,
    fontFamily: FONTS.titleBold,
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingBottom: 48, // the last row can scroll clear of the bottom edge
  },
  sections: {
    padding: 16,
    paddingTop: 20, // the first section title starts below the header line, never under it
    gap: 24,
  },
});
