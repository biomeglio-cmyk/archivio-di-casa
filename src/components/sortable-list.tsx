import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type Animated from 'react-native-reanimated';
import type { AnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';

import { Text } from '@/components/text';
import { BRAND_GRADIENT, BRAND_SHADOW, GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { cardSurface, type Palette } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

const DRAG_DELAY_MS = 120; // in "Riordina" a short touch is enough to pick a row up
const ROW_GAP = 10;

type Props<T> = {
  items: T[];
  keyFor: (item: T) => number;
  labelFor: (item: T) => string; // VoiceOver
  renderRow: (item: T) => ReactNode; // usually a ReorderRow
  onReorder: (items: T[]) => void; // after a drag that changed the order
  scrollableRef?: AnimatedRef<Animated.ScrollView>; // the page scrolls when a row nears its edge
};

// The rows of "Riordina" (docs/design/RiordinaLista.dc.html): one column, 10pt apart. Touch a row
// and drag it: it lifts (a little bigger, with a shadow), the others make room, the order is saved
// on release. VoiceOver: "Sposta prima" / "Sposta dopo".
export function SortableList<T>({ items, keyFor, labelFor, renderRow, onReorder, scrollableRef }: Props<T>) {
  const { t } = useI18n();
  function moveBy(item: T, delta: number) {
    const from = items.indexOf(item);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= items.length) return;
    const next = [...items];
    next.splice(from, 1);
    next.splice(to, 0, item);
    onReorder(next);
  }

  return (
    <Sortable.Grid
      data={items}
      keyExtractor={(item) => String(keyFor(item))}
      columns={1}
      rowGap={ROW_GAP}
      dragActivationDelay={DRAG_DELAY_MS}
      activeItemScale={1.04}
      activeItemShadowOpacity={0.3}
      inactiveItemOpacity={1}
      scrollableRef={scrollableRef}
      autoScrollEnabled={scrollableRef !== undefined}
      onDragStart={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      onDragEnd={({ data }) => {
        if (data.some((item, index) => keyFor(item) !== keyFor(items[index]))) onReorder(data);
      }}
      renderItem={({ item }) => (
        <View
          accessible
          accessibilityLabel={labelFor(item)}
          accessibilityHint={t('sortableList.dragHint')}
          accessibilityActions={[
            { name: 'earlier', label: t('sortableList.moveEarlier') },
            { name: 'later', label: t('sortableList.moveLater') },
          ]}
          onAccessibilityAction={(event) => moveBy(item, event.nativeEvent.actionName === 'earlier' ? -1 : 1)}>
          {renderRow(item)}
        </View>
      )}
    />
  );
}

type RowProps = {
  thumb: ReactNode; // 86 × 54: the card, the photo, the category square
  title: string;
  subtitle?: string | null;
};

// A row of "Riordina": white, 76 high, a small picture, name 16/600 and a 13 line, the handle on
// the right
export function ReorderRow({ thumb, title, subtitle }: RowProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      {thumb}
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <SymbolView name="line.3.horizontal" tintColor={theme.textSecondary} size={20} weight="semibold" />
    </View>
  );
}

type HeaderProps = {
  title: string; // "Riordina le tessere"
  hint: string; // "Tieni premuto una tessera e trascinala…"
  onDone: () => void;
};

// Top of "Riordina": the title and "Fine" in the main gradient, then the hint on pale lilac
export function ReorderHeader({ title, hint, onDone }: HeaderProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  return (
    <View>
      <View style={styles.bar}>
        <Text style={styles.heading} accessibilityRole="header">
          {title}
        </Text>
        <Pressable onPress={onDone} accessibilityRole="button" style={({ pressed }) => [styles.done, pressed && styles.pressed]}>
          <LinearGradient
            colors={BRAND_GRADIENT}
            start={GRADIENT_START}
            end={GRADIENT_END}
            style={[StyleSheet.absoluteFill, styles.doneFill]}
          />
          <Text style={styles.doneText}>{t('common.done')}</Text>
        </Pressable>
      </View>
      <View style={styles.hint}>
        <SymbolView name="hand.draw" tintColor={theme.indigo} size={20} />
        <Text style={styles.hintText}>{hint}</Text>
      </View>
    </View>
  );
}

// Under the rows of every "Riordina". A component (not a plain string) so the text follows the
// language live; used as {REORDER_FOOTER} inside a <Text>.
function ReorderFooterText() {
  const { t } = useI18n();
  return <>{t('sortableList.footer')}</>;
}
export const REORDER_FOOTER = <ReorderFooterText />;

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  row: {
    ...cardSurface(c),
    height: 76,
    borderRadius: 20,
    paddingLeft: 10,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    boxShadow: '0 4px 14px rgba(28, 30, 70, 0.07)',
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  heading: {
    flexShrink: 1,
    fontSize: 17,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  done: {
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 20,
    justifyContent: 'center',
    boxShadow: BRAND_SHADOW,
  },
  doneFill: {
    borderRadius: 20,
  },
  doneText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FONTS.semiBold,
  },
  pressed: {
    opacity: 0.8,
  },
  hint: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: c.paleLilac,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONTS.regular,
    color: c.textOnLilac,
  },
});
