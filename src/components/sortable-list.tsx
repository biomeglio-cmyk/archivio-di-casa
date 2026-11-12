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
import { CardSurface, Colors } from '@/constants/theme';
import { FONTS } from '@/constants/typography';

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
          accessibilityHint="Trascina per spostarlo, oppure usa le azioni Sposta prima e Sposta dopo"
          accessibilityActions={[
            { name: 'earlier', label: 'Sposta prima' },
            { name: 'later', label: 'Sposta dopo' },
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
      <SymbolView name="line.3.horizontal" tintColor={Colors.light.textSecondary} size={20} weight="semibold" />
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
          <Text style={styles.doneText}>Fine</Text>
        </Pressable>
      </View>
      <View style={styles.hint}>
        <SymbolView name="hand.draw" tintColor={Colors.light.indigo} size={20} />
        <Text style={styles.hintText}>{hint}</Text>
      </View>
    </View>
  );
}

// Under the rows of every "Riordina"
export const REORDER_FOOTER =
  'Allo stesso modo riordini le tessere, le persone in Famiglia e i Preferiti: tieni premuto una riga e trascinala con la maniglia a destra.';

const styles = StyleSheet.create({
  row: {
    ...CardSurface,
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
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
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
    color: Colors.light.text,
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
    backgroundColor: Colors.light.paleLilac,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONTS.regular,
    color: Colors.light.textOnLilac,
  },
});
