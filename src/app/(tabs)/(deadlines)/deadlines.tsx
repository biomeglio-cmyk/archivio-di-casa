import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Modal, Pressable, SectionList, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { DeadlineRow } from '@/components/deadline-row';
import { MonthCalendar } from '@/components/month-calendar';
import { TabHeader } from '@/components/tab-header';
import { ThemedText } from '@/components/themed-text';
import { WeekStrip } from '@/components/week-strip';
import { BRAND_COLOR, DANGER_COLOR } from '@/constants/brand';
import { FONTS } from '@/constants/typography';
import { listDocumentsWithExpiry } from '@/db/documents';
import type { DocumentListItem } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { addDaysIso, formatShortDate, mondayOfIso, parseISODate, toISODate } from '@/utils/dates';
import { groupDeadlines, type DeadlineSection } from '@/utils/deadlines';

type Section = DeadlineSection<DocumentListItem>;

// "/deadlines", list first: a compact week strip, then every deadline in sections
// ("Da sistemare", "Questa settimana", "Questo mese", "Più avanti"). Tapping a day jumps to it;
// "Mese" opens the month grid.
export default function DeadlinesScreen() {
  const theme = useTheme();
  // iOS grouped list: page background with surface-colored blocks (theme tokens)
  const cardColor = theme.surface;
  const { data: documents } = useDbQuery(listDocumentsWithExpiry, []);
  const listRef = useRef<SectionList<DocumentListItem, Section>>(null);

  const todayIso = toISODate(new Date());
  const [weekStart, setWeekStart] = useState(() => mondayOfIso(todayIso));
  const [selected, setSelected] = useState<string | null>(null); // day highlighted in the list
  const [monthOpen, setMonthOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => monthOf(todayIso));

  const sections = groupDeadlines(documents ?? []);

  // One dot per category color on each day with deadlines; red for days already passed
  const markers = new Map<string, string[]>();
  for (const doc of documents ?? []) {
    if (!doc.expiresAt) continue;
    const color = doc.expiresAt < todayIso ? DANGER_COLOR : doc.category.colors.text;
    const colors = markers.get(doc.expiresAt) ?? [];
    if (!colors.includes(color)) markers.set(doc.expiresAt, [...colors, color]);
  }

  // Scrolls the list to the first deadline of that day (all rows are rendered, see initialNumToRender)
  function scrollToDay(iso: string) {
    for (const [sectionIndex, section] of sections.entries()) {
      const itemIndex = section.data.findIndex((d) => d.expiresAt === iso);
      if (itemIndex >= 0) {
        listRef.current?.scrollToLocation({ sectionIndex, itemIndex, viewOffset: 12, viewPosition: 0 });
        return;
      }
    }
  }

  // First tap selects and jumps to the day; a second tap on the same day clears the highlight
  function tapDay(iso: string) {
    if (iso === selected) {
      setSelected(null);
      return;
    }
    setSelected(iso);
    scrollToDay(iso);
  }

  // A day chosen in the month grid: close it, show its week and jump to it
  function pickFromMonth(iso: string) {
    setMonthOpen(false);
    setWeekStart(mondayOfIso(iso));
    setSelected(iso);
    // Wait for the sheet to close before scrolling
    setTimeout(() => scrollToDay(iso), 350);
  }

  function goToToday() {
    setWeekStart(mondayOfIso(todayIso));
    setSelected(null);
    listRef.current?.scrollToLocation({ sectionIndex: 0, itemIndex: 0, viewOffset: 400, viewPosition: 0 });
  }

  const selectedIsEmpty = selected !== null && !markers.has(selected);
  const onCurrentWeek = weekStart === mondayOfIso(todayIso);

  function openMonth() {
    setVisibleMonth(monthOf(selected ?? weekStart));
    setMonthOpen(true);
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* The shared tab header, fixed; "Mese" opens the month grid */}
      <TabHeader title="Scadenze" action={{ label: 'Mese', onPress: openMonth }} />
      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        initialNumToRender={500} // a household has few deadlines: render them all, so jumps always work
        onScrollToIndexFailed={() => undefined}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* "Oggi" only when another week is shown */}
            {!onCurrentWeek && (
              <Pressable onPress={goToToday} hitSlop={10} accessibilityRole="button" style={styles.todayLink}>
                <Text style={styles.smallLink}>Oggi</Text>
              </Pressable>
            )}
            <WeekStrip
              weekStartIso={weekStart}
              todayIso={todayIso}
              selectedIso={selected}
              markers={markers}
              onSelect={tapDay}
              onPrevWeek={() => setWeekStart(addDaysIso(weekStart, -7))}
              onNextWeek={() => setWeekStart(addDaysIso(weekStart, 7))}
            />
            {selectedIsEmpty && (
              <ThemedText themeColor="textSecondary" style={styles.note}>
                Nessuna scadenza per {formatShortDate(selected)}
              </ThemedText>
            )}
          </View>
        }
        renderSectionHeader={({ section }) => (
          // iOS grouped header: footnote, uppercase, grey ("DA SISTEMARE" is red)
          <Text
            style={[styles.sectionTitle, { color: section.key === 'overdue' ? DANGER_COLOR : theme.textSecondary }]}>
            {section.title}
          </Text>
        )}
        renderItem={({ item, index, section }) => (
          <DeadlineRow
            document={item}
            href={{ pathname: '/(tabs)/(deadlines)/document/[id]', params: { id: String(item.id) } }}
            cardColor={cardColor}
            first={index === 0}
            last={index === section.data.length - 1}
            highlighted={item.expiresAt === selected}
          />
        )}
        ListEmptyComponent={
          documents ? (
            <View style={styles.empty}>
              <SymbolView name="calendar.badge.checkmark" tintColor={theme.textSecondary} size={44} />
              <ThemedText style={styles.emptyTitle}>Nessuna scadenza in vista</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                Aggiungi un documento con una data di scadenza dal pulsante +: comparirà qui.
              </ThemedText>
            </View>
          ) : undefined
        }
      />

      <Modal
        visible={monthOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setMonthOpen(false)}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={styles.sheetBar}>
            <Pressable onPress={() => setMonthOpen(false)} hitSlop={12} accessibilityRole="button">
              <Text style={styles.close}>Chiudi</Text>
            </Pressable>
          </View>
          <MonthCalendar
            year={visibleMonth.year}
            month={visibleMonth.month}
            todayIso={todayIso}
            selectedIso={selected}
            markers={markers}
            onSelect={pickFromMonth}
            onPrevMonth={() => setVisibleMonth(shiftMonth(visibleMonth, -1))}
            onNextMonth={() => setVisibleMonth(shiftMonth(visibleMonth, 1))}
            onToday={() => setVisibleMonth(monthOf(todayIso))}
          />
        </View>
      </Modal>
    </View>
  );
}

function monthOf(iso: string) {
  const date = parseISODate(iso);
  return { year: date.getFullYear(), month: date.getMonth() };
}

// new Date(year, 12) is January of the next year, so no special cases
function shiftMonth(current: { year: number; month: number }, delta: number) {
  const first = new Date(current.year, current.month + delta, 1);
  return { year: first.getFullYear(), month: first.getMonth() };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  header: {
    gap: 8,
  },
  todayLink: {
    alignSelf: 'flex-end',
    paddingHorizontal: 4,
  },
  smallLink: {
    color: BRAND_COLOR,
    fontSize: 15,
  },
  note: {
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 13, // iOS footnote, system font
    lineHeight: 18,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 6,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
    fontFamily: FONTS.semiBold,
  },
  emptyText: {
    textAlign: 'center',
  },
  sheet: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  sheetBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 4,
  },
  close: {
    color: BRAND_COLOR,
    fontSize: 17,
    fontFamily: FONTS.semiBold,
  },
});
