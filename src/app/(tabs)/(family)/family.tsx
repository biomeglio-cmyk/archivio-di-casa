import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { Fragment, useState } from 'react';
import { Alert, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { announce } from '@/a11y/accessibility';
import { accessibilityActionsOf, personQuickActions, runAccessibilityAction } from '@/actions/quick-actions';
import { useIconRow } from '@/components/icon-row';
import { goHome, PageHeader } from '@/components/page-header';
import { PersonAvatar } from '@/components/person-avatar';
import { RoundIconButton } from '@/components/round-icon-button';
import { REORDER_FOOTER, ReorderHeader, ReorderRow, SortableList } from '@/components/sortable-list';
import { Text } from '@/components/text';
import { WhiteCard } from '@/components/white-card';
import { roleLabel } from '@/constants/person-roles';
import { type Palette, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { listPeopleWithCounts, savePeopleOrder } from '@/db/people';
import type { PersonWithCount } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { usePressed } from '@/hooks/use-pressed';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

const ROW_INSET = 78; // separators start after the 48pt avatar

// "Famiglia" (docs/design/Utenti.dc.html): back and "+", title and "Un profilo per ogni persona di
// casa", "COMPONENTI" with one row per person (avatar, name, the "Tu" badge, "N documenti"), the
// dashed "Aggiungi una persona" and the privacy note. Long press on a row: "Riordina"
// (docs/design/RiordinaLista.dc.html). Our extra: "N in scadenza" in red.
export default function FamilyScreen() {
  const { t } = useI18n();
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const iconRow = useIconRow(); // large text: avatars and icons above their texts
  const { data: people } = useDbQuery(listPeopleWithCounts, []);
  const [reordering, setReordering] = useState(false);
  const addPerson = () => router.push('/person-form');

  async function saveOrder(ordered: PersonWithCount[]) {
    try {
      await savePeopleOrder(db, ordered.map((p) => p.id));
    } catch (error) {
      Alert.alert(t('family.orderSaveFailed'), error instanceof Error ? error.message : String(error));
    }
  }

  function startReorder() {
    if ((people?.length ?? 0) < 2) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setReordering(true);
    announce(t('a11y.browse.reorderOn'));
  }

  function endReorder() {
    setReordering(false);
    announce(t('a11y.browse.reorderOff'));
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
              title={t('family.reorderTitle')}
              hint={t('family.reorderHint')}
              onDone={endReorder}
            />
            <Text style={styles.section} accessibilityRole="header">
              {t('family.members')}
            </Text>
            <View style={styles.reorderList}>
              <SortableList
                items={people}
                keyFor={(person) => person.id}
                labelFor={(person) => `${person.name}, ${t('common.documents', { count: person.documentCount })}`}
                renderRow={(person) => (
                  <ReorderRow
                    thumb={
                      <View style={styles.thumb}>
                        <PersonAvatar name={person.name} photoPath={person.photoPath} size={48} />
                      </View>
                    }
                    title={person.name}
                    subtitle={t('common.documents', { count: person.documentCount })}
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
              title={t('family.title')}
              subtitle={t('family.subtitle')}
              onBack={goHome}
              right={
                <RoundIconButton symbol="plus" accessibilityLabel={t('family.addPerson')} color={theme.text} onPress={addPerson} />
              }
            />
            {people && people.length > 0 && (
              <>
                <Text style={styles.section} accessibilityRole="header">
                  {t('family.members')}
                </Text>
                <WhiteCard style={styles.card}>
                  {people.map((person, index) => (
                    <Fragment key={person.id}>
                      {index > 0 && <View style={[styles.separator, iconRow.large && styles.separatorLarge]} />}
                      <PersonRow person={person} onLongPress={people.length > 1 ? startReorder : undefined} />
                    </Fragment>
                  ))}
                </WhiteCard>
              </>
            )}

            <Pressable
              onPress={addPerson}
              accessibilityRole="button"
              style={({ pressed }) => [styles.add, pressed && styles.addPressed]}>
              <SymbolView name="plus" tintColor={theme.textSecondary} size={24} weight="semibold" />
              <Text style={styles.addLabel}>{t('family.addPerson')}</Text>
            </Pressable>

            <View style={[styles.note, iconRow.row]}>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <SymbolView name="lock" tintColor={theme.indigo} size={18} />
              </View>
              <Text style={[styles.noteText, iconRow.texts]}>{t('family.privacyNote')}</Text>
            </View>
          </>
        )}
      </Animated.ScrollView>
    </GestureHandlerRootView>
  );
}

function PersonRow({ person, onLongPress }: { person: PersonWithCount; onLongPress?: () => void }) {
  const { t } = useI18n();
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const db = useSQLiteContext();
  const { pressed, handlers } = usePressed();
  const { fontScale } = useWindowDimensions();
  const lines = fontScale > 1.3 ? undefined : 1; // larger text: the whole name and details
  const iconRow = useIconRow(); // large text: the avatar above, the texts and the chevron under it
  const quick = personQuickActions(db, person);
  // VoiceOver: the quick actions and "Riordina" (the long press)
  const actions = [
    ...quick.filter((a) => !a.destructive),
    ...(onLongPress
      ? [{ key: 'reorder', label: t('family.reorderTitle'), symbol: 'arrow.up.arrow.down' as const, onPress: onLongPress }]
      : []),
    ...quick.filter((a) => a.destructive),
  ];
  const role = roleLabel(person.role);
  const details = [t('common.documents', { count: person.documentCount })];
  const expiring = person.expiringCount > 0 ? t('family.expiring', { count: person.expiringCount }) : null;

  return (
    <Pressable
      {...handlers}
      onPress={() => router.push({ pathname: '/person/[id]', params: { id: String(person.id) } })}
      onLongPress={onLongPress}
      delayLongPress={400}
      accessibilityRole="button"
      accessibilityLabel={[person.name, person.role === 'me' ? t('family.youSpoken') : role, ...details, expiring]
        .filter(Boolean)
        .join(', ')}
      accessibilityHint={onLongPress ? t('family.reorderA11yHint') : undefined}
      accessibilityActions={accessibilityActionsOf(actions)}
      onAccessibilityAction={(event) => runAccessibilityAction(actions, event.nativeEvent.actionName)}
      style={[styles.row, iconRow.row, pressed && styles.rowPressed]}>
      <PersonAvatar name={person.name} photoPath={person.photoPath} size={48} shadow />
      {/* The texts and the chevron: one row, under the avatar with large text */}
      <View style={[styles.body, iconRow.texts]}>
        <View style={styles.texts}>
          <View style={styles.nameLine}>
            <Text style={styles.name} numberOfLines={lines}>
              {person.name}
            </Text>
            {person.role === 'me' && <Text style={styles.me}>{t('personRoles.you')}</Text>}
          </View>
          <View style={styles.countLine}>
            <Text style={styles.count} numberOfLines={lines}>
              {details.join(' · ')}
            </Text>
            {/* "N in scadenza": red with a "!" (not only the color) */}
            {expiring && (
              <View style={styles.expiringBox}>
                <SymbolView name="exclamationmark.circle.fill" tintColor={theme.error} size={13} />
                <Text style={[styles.count, styles.expiring]} numberOfLines={lines}>
                  {expiring}
                </Text>
              </View>
            )}
          </View>
        </View>
        <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={15} weight="semibold" />
      </View>
    </Pressable>
  );
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
  section: {
    marginTop: 26,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: c.textSecondary,
  },
  card: {
    marginTop: 12,
    paddingVertical: 4,
  },
  separator: {
    height: 1,
    marginLeft: ROW_INSET,
    marginRight: 16,
    backgroundColor: c.separator,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  separatorLarge: {
    marginLeft: 16, // large text: no avatar column to start after
  },
  rowPressed: {
    backgroundColor: c.backgroundSelected,
  },
  texts: {
    flex: 1,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  name: {
    flexShrink: 1,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  me: {
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: c.lilac,
    color: c.indigo,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    textTransform: 'uppercase',
  },
  count: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  countLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 8,
  },
  expiringBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiring: {
    color: c.error,
  },
  add: {
    marginTop: 14,
    minHeight: 76,
    paddingVertical: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: c.dashed,
    borderRadius: 22,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addPressed: {
    backgroundColor: c.paleLilac,
  },
  addLabel: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: c.textSecondary,
  },
  note: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: c.paleLilac,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONTS.regular,
    color: c.textOnLilac,
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
    color: c.textSecondary,
    textAlign: 'center',
  },
});
