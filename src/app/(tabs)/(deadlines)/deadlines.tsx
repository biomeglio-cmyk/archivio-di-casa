import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { Fragment, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { announce } from '@/a11y/accessibility';
import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { MonthCalendar, WeekCalendar, type DayMarkers } from '@/components/deadline-calendar';
import { DEADLINE_ROW_INSET, DeadlineListRow } from '@/components/deadline-list-row';
import { FitLine } from '@/components/fit-line';
import { goHome, PageHeader } from '@/components/page-header';
import { RoundIconButton } from '@/components/round-icon-button';
import { Segmented } from '@/components/segmented';
import { Text } from '@/components/text';
import { WhiteCard } from '@/components/white-card';
import { type Palette, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { listDocumentsWithExpiry, saveDocumentDeadline, setPaymentStatus } from '@/db/documents';
import type { DocumentListItem } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useI18n } from '@/i18n';
import { useFormat } from '@/i18n/use-format';
import { addDaysIso, mondayOfIso, parseISODate, toISODate } from '@/utils/dates';
import { groupDeadlines, upcomingSummary } from '@/utils/deadlines';
import { whenBelowLimit } from '@/settings/free-limit';
import { useLargeText } from '@/hooks/use-large-text';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

type Dated = DocumentListItem & { expiresAt: string };

const documentHref = (id: number) =>
  ({ pathname: '/(tabs)/(deadlines)/document/[id]', params: { id: String(id) } }) as const;

// "Scadenze" (docs/design/Scadenze.dc.html): back and "+" (new reminder), title and "N cose da fare",
// Settimana / Mese, the calendar with a dot on the days with deadlines and the deadlines of the
// chosen day, then the lists "Questa settimana" and one per month. Our extras: "Da sistemare" for
// what has expired, the Da pagare / Pagata badge, and a long press on a row to change, mark as paid
// or take away the deadline (repeats, reminders and the «Sottomano» calendar follow on save).
export default function DeadlinesScreen() {
  const { t } = useI18n();
  const fmt = useFormat();
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { data: documents } = useDbQuery(listDocumentsWithExpiry, []);

  const todayIso = toISODate(new Date());
  const [view, setView] = useState<'week' | 'month'>('week');
  const [selected, setSelected] = useState(todayIso);
  const [weekStart, setWeekStart] = useState(() => mondayOfIso(todayIso));
  const [visibleMonth, setVisibleMonth] = useState(() => monthOf(todayIso));
  const [sheetFor, setSheetFor] = useState<Dated | null>(null);

  const dated = (documents ?? []).filter((d): d is Dated => d.expiresAt !== null);
  const sections = groupDeadlines(dated);
  const upcoming = dated.filter((d) => d.expiresAt >= todayIso).length;

  // The first deadline of each day gives the dot its color (its category)
  const markers: DayMarkers = new Map();
  for (const doc of dated) {
    const current = markers.get(doc.expiresAt);
    markers.set(doc.expiresAt, { color: current?.color ?? doc.category.colors.bottom, count: (current?.count ?? 0) + 1 });
  }
  const dayItems = dated.filter((d) => d.expiresAt === selected);

  // VoiceOver: the chosen day and how many deadlines it has (the box under the calendar changes)
  function sayDay(iso: string) {
    const count = dated.filter((d) => d.expiresAt === iso).length;
    const date = fmt.dayMonth(parseISODate(iso));
    announce(count > 0 ? t('a11y.deadlines.dayCount', { date, count }) : `${date}, ${t('deadlines.dayEmpty')}`);
  }

  function pickDay(iso: string) {
    setSelected(iso);
    setWeekStart(mondayOfIso(iso));
    sayDay(iso);
  }

  function pickMonthDay(iso: string) {
    setSelected(iso);
    sayDay(iso);
  }

  function changeView(next: 'week' | 'month') {
    if (next === 'month') setVisibleMonth(monthOf(selected));
    else setWeekStart(mondayOfIso(selected));
    setView(next);
  }

  function shiftWeek(delta: number) {
    const start = addDaysIso(weekStart, delta * 7);
    setWeekStart(start);
    setSelected(start <= todayIso && todayIso <= addDaysIso(start, 6) ? todayIso : start);
  }

  function shiftMonth(delta: number) {
    const first = new Date(visibleMonth.year, visibleMonth.month + delta, 1);
    setVisibleMonth({ year: first.getFullYear(), month: first.getMonth() });
    // The current month opens on today, the others on their first day
    setSelected(todayIso.startsWith(toISODate(first).slice(0, 7)) ? todayIso : toISODate(first));
  }

  // "+": a new document whose deadline is the chosen day (the form opens with "Aggiungi scadenza" on)
  const addReminder = () =>
    whenBelowLimit(() => router.push({ pathname: '/new-document', params: { expiresAt: selected } }));

  const open = (document: DocumentListItem) => router.push(documentHref(document.id));

  function sheetActions(document: Dated): SheetAction[] {
    const actions: SheetAction[] = [
      { key: 'open', label: t('deadlines.openDocument'), symbol: 'doc.text', onPress: () => open(document) },
      {
        key: 'edit',
        label: t('deadlines.editDeadline'),
        symbol: 'calendar.badge.clock',
        onPress: () => router.push({ pathname: '/deadline/[id]', params: { id: String(document.id) } }),
      },
    ];
    if (document.paymentStatus) {
      const paid = document.paymentStatus === 'paid';
      actions.push({
        key: 'paid',
        label: paid ? t('deadlines.markDue') : t('deadlines.markPaid'),
        symbol: paid ? 'arrow.uturn.backward.circle' : 'checkmark.circle',
        onPress: () => void setPaymentStatus(db, document.id, paid ? 'due' : 'paid'),
      });
    }
    actions.push({
      key: 'remove',
      label: t('deadlines.removeDeadline'),
      symbol: 'calendar.badge.minus',
      destructive: true,
      onPress: () =>
        Alert.alert(t('deadlines.removeAlert.title'), t('deadlines.removeAlert.message'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('deadlines.removeAlert.confirm'), style: 'destructive', onPress: () => void saveDocumentDeadline(db, document.id, null) },
        ]),
    });
    return actions;
  }

  const dayBox = <DayDeadlines iso={selected} items={dayItems} onOpen={open} />;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.page, { paddingTop: insets.top + 8, paddingBottom: Spacing.belowContent }]}>
        <PageHeader
          title={t('deadlines.title')}
          subtitle={documents ? upcomingSummary(upcoming) : ' '}
          onBack={goHome}
          right={<RoundIconButton symbol="plus" accessibilityLabel={t('deadlines.newReminder')} color={theme.text} onPress={addReminder} />}
        />

        <View style={styles.switch}>
          <Segmented
            accessibilityLabel={t('a11y.segmented.calendarView')}
            values={[t('deadlines.week'), t('deadlines.month')]}
            selectedIndex={view === 'week' ? 0 : 1}
            onChange={(index) => changeView(index === 0 ? 'week' : 'month')}
          />
        </View>

        {view === 'week' ? (
          <>
            <WeekCalendar
              weekStartIso={weekStart}
              todayIso={todayIso}
              selectedIso={selected}
              markers={markers}
              onSelect={pickDay}
              onPrevious={() => shiftWeek(-1)}
              onNext={() => shiftWeek(1)}
            />
            {/* Our extra: the deadlines of the chosen day under the week too */}
            {(selected !== todayIso || dayItems.length > 0) && <View style={styles.weekDayBox}>{dayBox}</View>}
          </>
        ) : (
          <MonthCalendar
            year={visibleMonth.year}
            month={visibleMonth.month}
            todayIso={todayIso}
            selectedIso={selected}
            markers={markers}
            onSelect={pickMonthDay}
            onPrevious={() => shiftMonth(-1)}
            onNext={() => shiftMonth(1)}>
            <View style={styles.monthDayBox}>{dayBox}</View>
          </MonthCalendar>
        )}

        {sections.map((section) => (
          <View key={section.key}>
            <Text
              style={[styles.sectionTitle, section.kind === 'overdue' && styles.sectionOverdue]}
              accessibilityRole="header">
              {section.title}
            </Text>
            <WhiteCard style={styles.card}>
              {section.data.map((document, index) => (
                <Fragment key={document.id}>
                  {index > 0 && <View style={styles.separator} />}
                  <DeadlineListRow
                    document={document as Dated}
                    near={section.kind !== 'month'}
                    onPress={() => open(document)}
                    onLongPress={() => setSheetFor(document as Dated)}
                  />
                </Fragment>
              ))}
            </WhiteCard>
          </View>
        ))}

        {documents && sections.length === 0 && (
          <View style={styles.empty}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <SymbolView name="calendar.badge.checkmark" tintColor={theme.textSecondary} size={40} />
            </View>
            <Text style={styles.emptyTitle} accessibilityRole="header">
              {t('deadlines.emptyTitle')}
            </Text>
            <Text style={styles.emptyText}>{t('deadlines.emptyText')}</Text>
          </View>
        )}
      </ScrollView>

      <ActionSheet
        visible={sheetFor !== null}
        title={sheetFor?.title ?? ''}
        subtitle={sheetFor ? t('deadlines.sheetSubtitle', { date: fmt.shortDate(sheetFor.expiresAt) }) : undefined}
        actions={sheetFor ? sheetActions(sheetFor) : []}
        onClose={() => setSheetFor(null)}
      />
    </View>
  );
}

// "14 NOVEMBRE" and the deadlines of that day (dot in the category color, name, amount), or
// "Nessuna scadenza in questo giorno", on pale lilac
function DayDeadlines({ iso, items, onOpen }: { iso: string; items: Dated[]; onOpen: (d: Dated) => void }) {
  const { t } = useI18n();
  const fmt = useFormat();
  const styles = useThemedStyles(makeStyles);
  // Large text (XXL and up): the shared row rule (FitLine): dot and name, and the amount or
  // "promemoria" on the same line when both fit, else under the name, left-aligned; never a
  // word broken. Default size: one line as in the design.
  const large = useLargeText();
  const date = parseISODate(iso);
  return (
    <View style={styles.dayBox}>
      <Text style={styles.dayTitle} accessibilityRole="header">
        {fmt.dayMonth(date)}
      </Text>
      {items.map((item) => {
        const side = item.amountCents !== null ? fmt.euro(item.amountCents) : item.repeat ? t('deadlines.dayRepeats') : t('deadlines.dayReminder');
        return (
          <Pressable
            key={item.id}
            onPress={() => onOpen(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}, ${side}`}
            hitSlop={{ top: 4, bottom: 4 }}
            style={({ pressed }) => [styles.dayItem, large && styles.dayItemLarge, pressed && styles.pressed]}>
            <View style={[styles.dayDot, large && styles.dayDotLarge, { backgroundColor: item.category.colors.bottom }]} />
            {large ? (
              <FitLine
                gap={10}
                startMeasure={<Text style={styles.dayItemTitle}>{item.title}</Text>}
                start={<Text style={styles.dayItemTitle}>{item.title}</Text>}
                end={<Text style={styles.dayItemSide}>{side}</Text>}
              />
            ) : (
              <>
                <Text style={styles.dayItemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.dayItemSide} numberOfLines={1}>
                  {side}
                </Text>
              </>
            )}
          </Pressable>
        );
      })}
      {items.length === 0 && <Text style={styles.dayEmpty}>{t('deadlines.dayEmpty')}</Text>}
    </View>
  );
}

function monthOf(iso: string) {
  const date = parseISODate(iso);
  return { year: date.getFullYear(), month: date.getMonth() };
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  page: {
    paddingHorizontal: Spacing.side,
  },
  switch: {
    marginTop: 18,
  },
  weekDayBox: {
    marginTop: 12,
  },
  monthDayBox: {
    marginTop: 10,
  },
  dayBox: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: c.paleLilac,
  },
  dayTitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: c.textSecondary,
  },
  dayItem: {
    marginTop: 8,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pressed: {
    opacity: 0.6,
  },
  dayItemLarge: {
    alignItems: 'flex-start', // the dot next to the first line of the name
    paddingVertical: 4,
  },
  dayDotLarge: {
    marginTop: 9,
  },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dayItemTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  dayItemSide: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: c.textSecondary,
  },
  dayEmpty: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  sectionTitle: {
    marginTop: 26,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: c.textSecondary,
  },
  sectionOverdue: {
    color: c.error,
  },
  card: {
    marginTop: 12,
    paddingVertical: 4,
  },
  separator: {
    height: 1,
    marginLeft: DEADLINE_ROW_INSET,
    marginRight: 16,
    backgroundColor: c.separator,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 40,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: c.text,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
    textAlign: 'center',
  },
});
