import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { Fragment, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { accessibilityActionsOf, personQuickActions, runAccessibilityAction } from '@/actions/quick-actions';
import { goHome, PageHeader } from '@/components/page-header';
import { PersonAvatar } from '@/components/person-avatar';
import { RoundIconButton } from '@/components/round-icon-button';
import { REORDER_FOOTER, ReorderHeader, ReorderRow, SortableList } from '@/components/sortable-list';
import { Text } from '@/components/text';
import { WhiteCard } from '@/components/white-card';
import { roleLabel } from '@/constants/person-roles';
import { Colors, Spacing, themedStyles } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { listPeopleWithCounts, savePeopleOrder } from '@/db/people';
import type { PersonWithCount } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { usePressed } from '@/hooks/use-pressed';

const ROW_INSET = 78; // separators start after the 48pt avatar

const documentsLabel = (count: number) => (count === 1 ? '1 documento' : `${count} documenti`);

// "Famiglia" (docs/design/Utenti.dc.html): back and "+", title and "Un profilo per ogni persona di
// casa", "COMPONENTI" with one row per person (avatar, name, the "Tu" badge, "N documenti"), the
// dashed "Aggiungi una persona" and the privacy note. Long press on a row: "Riordina"
// (docs/design/RiordinaLista.dc.html). Our extra: "N in scadenza" in red.
export default function FamilyScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const { data: people } = useDbQuery(listPeopleWithCounts, []);
  const [reordering, setReordering] = useState(false);
  const addPerson = () => router.push('/person-form');

  async function saveOrder(ordered: PersonWithCount[]) {
    try {
      await savePeopleOrder(db, ordered.map((p) => p.id));
    } catch (error) {
      Alert.alert('Impossibile salvare l’ordine', error instanceof Error ? error.message : String(error));
    }
  }

  function startReorder() {
    if ((people?.length ?? 0) < 2) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReordering(true);
  }

  return (
    <GestureHandlerRootView style={styles.screen}>
      <Animated.ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.page, { paddingTop: insets.top + 8, paddingBottom: Spacing.belowContent }]}>
        {reordering && people ? (
          <>
            <ReorderHeader
              title="Riordina la famiglia"
              hint="Tieni premuto una persona e trascinala dove vuoi."
              onDone={() => setReordering(false)}
            />
            <Text style={styles.section}>Componenti</Text>
            <View style={styles.reorderList}>
              <SortableList
                items={people}
                keyFor={(person) => person.id}
                labelFor={(person) => person.name}
                renderRow={(person) => (
                  <ReorderRow
                    thumb={
                      <View style={styles.thumb}>
                        <PersonAvatar name={person.name} photoPath={person.photoPath} size={48} />
                      </View>
                    }
                    title={person.name}
                    subtitle={documentsLabel(person.documentCount)}
                  />
                )}
                onReorder={saveOrder}
                scrollableRef={scrollRef}
              />
            </View>
            <Text style={styles.footer}>{REORDER_FOOTER}</Text>
          </>
        ) : (
          <>
            <PageHeader
              title="Famiglia"
              subtitle="Un profilo per ogni persona di casa"
              onBack={goHome}
              right={
                <RoundIconButton symbol="plus" accessibilityLabel="Aggiungi una persona" color={Colors.current.text} onPress={addPerson} />
              }
            />
            {people && people.length > 0 && (
              <>
                <Text style={styles.section}>Componenti</Text>
                <WhiteCard style={styles.card}>
                  {people.map((person, index) => (
                    <Fragment key={person.id}>
                      {index > 0 && <View style={styles.separator} />}
                      <PersonRow person={person} onLongPress={startReorder} />
                    </Fragment>
                  ))}
                </WhiteCard>
              </>
            )}

            <Pressable
              onPress={addPerson}
              accessibilityRole="button"
              style={({ pressed }) => [styles.add, pressed && styles.addPressed]}>
              <SymbolView name="plus" tintColor={Colors.current.textSecondary} size={24} weight="semibold" />
              <Text style={styles.addLabel}>Aggiungi una persona</Text>
            </Pressable>

            <View style={styles.note}>
              <SymbolView name="lock" tintColor={Colors.current.indigo} size={18} />
              <Text style={styles.noteText}>
                Tutto resta su questo telefono. Per mandare un documento a qualcuno, aprilo e tocca Invia.
              </Text>
            </View>
          </>
        )}
      </Animated.ScrollView>
    </GestureHandlerRootView>
  );
}

function PersonRow({ person, onLongPress }: { person: PersonWithCount; onLongPress: () => void }) {
  const db = useSQLiteContext();
  const { pressed, handlers } = usePressed();
  const actions = personQuickActions(db, person);
  const role = roleLabel(person.role);
  const details = [documentsLabel(person.documentCount)];

  return (
    <Pressable
      {...handlers}
      onPress={() => router.push({ pathname: '/person/[id]', params: { id: String(person.id) } })}
      onLongPress={onLongPress}
      delayLongPress={400}
      accessibilityRole="button"
      accessibilityLabel={[person.name, person.role === 'me' ? 'tu' : role, ...details].filter(Boolean).join(', ')}
      accessibilityHint="Tieni premuto per riordinare la famiglia"
      accessibilityActions={accessibilityActionsOf(actions)}
      onAccessibilityAction={(event) => runAccessibilityAction(actions, event.nativeEvent.actionName)}
      style={[styles.row, pressed && styles.rowPressed]}>
      <PersonAvatar name={person.name} photoPath={person.photoPath} size={48} shadow />
      <View style={styles.texts}>
        <View style={styles.nameLine}>
          <Text style={styles.name} numberOfLines={1}>
            {person.name}
          </Text>
          {person.role === 'me' && <Text style={styles.me}>Tu</Text>}
        </View>
        <Text style={styles.count} numberOfLines={1}>
          {details.join(' · ')}
          {person.expiringCount > 0 && <Text style={styles.expiring}>{` · ${person.expiringCount} in scadenza`}</Text>}
        </Text>
      </View>
      <SymbolView name="chevron.right" tintColor={Colors.current.textSecondary} size={15} weight="semibold" />
    </Pressable>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.current.background,
  },
  page: {
    paddingHorizontal: Spacing.side,
  },
  section: {
    marginTop: 26,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: Colors.current.textSecondary,
  },
  card: {
    marginTop: 12,
    paddingVertical: 4,
  },
  separator: {
    height: 1,
    marginLeft: ROW_INSET,
    marginRight: 16,
    backgroundColor: Colors.current.separator,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowPressed: {
    backgroundColor: Colors.current.backgroundSelected,
  },
  texts: {
    flex: 1,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flexShrink: 1,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: Colors.current.text,
  },
  me: {
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: Colors.current.lilac,
    color: Colors.current.indigo,
    fontSize: 11,
    fontFamily: FONTS.semiBold,
    textTransform: 'uppercase',
  },
  count: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
  },
  expiring: {
    color: Colors.current.error,
  },
  add: {
    marginTop: 14,
    height: 76,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.current.dashed,
    borderRadius: 22,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addPressed: {
    backgroundColor: Colors.current.paleLilac,
  },
  addLabel: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: Colors.current.textSecondary,
  },
  note: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: Colors.current.paleLilac,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONTS.regular,
    color: Colors.current.textOnLilac,
  },
  reorderList: {
    marginTop: 12,
  },
  thumb: {
    width: 86,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: 18,
    marginHorizontal: 4,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
    textAlign: 'center',
  },
}));
