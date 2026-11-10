import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DocumentRow } from '@/components/document-row';
import { MonthCalendar } from '@/components/month-calendar';
import { ThemedText } from '@/components/themed-text';
import { DANGER_COLOR, FONTS } from '@/constants/brand';
import { listDocumentsWithExpiry } from '@/db/documents';
import type { DocumentListItem } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { describeDayDistance, formatLongDay, toISODate } from '@/utils/dates';
import { daysUntil } from '@/utils/deadlines';

// "/" route, the app opens here: a month calendar like the iPhone one, the deadlines of the
// selected day (today at launch) and, below, the expired documents to sort out.
export default function DeadlinesScreen() {
  const { data: documents } = useDbQuery(listDocumentsWithExpiry, []);

  const today = new Date();
  const todayIso = toISODate(today);
  const [selectedIso, setSelectedIso] = useState(todayIso);
  const [visible, setVisible] = useState({ year: today.getFullYear(), month: today.getMonth() });

  // Documents grouped by expiry day, and the dots for the calendar
  const byDay = new Map<string, DocumentListItem[]>();
  for (const doc of documents ?? []) {
    if (!doc.expiresAt) continue;
    byDay.set(doc.expiresAt, [...(byDay.get(doc.expiresAt) ?? []), doc]);
  }
  const markers = new Map<string, string[]>();
  for (const [iso, docs] of byDay) {
    // Category text color; red for days already passed. One dot per color.
    const colors = docs.map((d) => (iso < todayIso ? DANGER_COLOR : d.category.colors.text));
    markers.set(iso, [...new Set(colors)]);
  }

  const dayDocuments = byDay.get(selectedIso) ?? [];
  const expired = (documents ?? []).filter((d) => d.expiresAt !== null && d.expiresAt < todayIso);

  // Month arrows: new Date(year, 12) is January of the next year, so no special cases
  function moveMonth(delta: number) {
    const first = new Date(visible.year, visible.month + delta, 1);
    setVisible({ year: first.getFullYear(), month: first.getMonth() });
  }

  function goToToday() {
    setVisible({ year: today.getFullYear(), month: today.getMonth() });
    setSelectedIso(todayIso);
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <MonthCalendar
        year={visible.year}
        month={visible.month}
        todayIso={todayIso}
        selectedIso={selectedIso}
        markers={markers}
        onSelect={setSelectedIso}
        onPrevMonth={() => moveMonth(-1)}
        onNextMonth={() => moveMonth(1)}
        onToday={goToToday}
      />

      {/* "Giovedì 12 novembre · tra 2 giorni" and the deadlines of that day */}
      <View style={styles.section}>
        <ThemedText style={styles.dayTitle}>
          {formatLongDay(selectedIso)} · {describeDayDistance(daysUntil(selectedIso))}
        </ThemedText>
        {documents && dayDocuments.length === 0 && (
          <ThemedText themeColor="textSecondary">Nessuna scadenza</ThemedText>
        )}
        {dayDocuments.map((doc) => (
          <DocumentRow
            key={doc.id}
            document={doc}
            href={{ pathname: '/(tabs)/(deadlines)/document/[id]', params: { id: String(doc.id) } }}
          />
        ))}
      </View>

      {expired.length > 0 && (
        <View style={styles.section}>
          <ThemedText style={[styles.dayTitle, { color: DANGER_COLOR }]}>Da sistemare</ThemedText>
          {expired.map((doc) => (
            <DocumentRow
              key={doc.id}
              document={doc}
              href={{ pathname: '/(tabs)/(deadlines)/document/[id]', params: { id: String(doc.id) } }}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  dayTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: FONTS.titleSemiBold,
    paddingHorizontal: 4,
  },
});
