import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView, ScrollView, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { DANGER_COLOR } from '@/constants/brand';
import { DEFAULT_CARD_COLOR } from '@/constants/card-colors';
import { listPinnedDocuments, savePinnedOrder } from '@/db/documents';
import type { DocumentListItem } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { resolveDocumentFile } from '@/storage/document-files';

const GAP = 8; // space between rows, part of the row slot
const MAX_FONT_SCALE = 2; // rows have a fixed height: text grows up to 2×, then stops

// Position of every row: document id → index in the list
type Positions = Record<number, number>;

// Modal "Sottomano" (from "Modifica" in Archivio): drag ≡ to reorder, red − to remove.
// Nothing is saved until "Fine"; "Annulla" leaves everything as it was.
export default function PinnedEditScreen() {
  const { data: pinned } = useDbQuery(listPinnedDocuments, []);

  return (
    // Native modals are a separate view tree: gestures need their own root here
    <GestureHandlerRootView style={styles.flex}>
      {/* The editor reads the list once, so it appears only after loading */}
      {pinned && <PinnedEditor initial={pinned} />}
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()}>Annulla</Stack.Toolbar.Button>
      </Stack.Toolbar>
    </GestureHandlerRootView>
  );
}

function indexPositions(ids: number[]): Positions {
  return Object.fromEntries(ids.map((id, index) => [id, index]));
}

function PinnedEditor({ initial }: { initial: DocumentListItem[] }) {
  const db = useSQLiteContext();
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(fontScale, MAX_FONT_SCALE);
  // Fixed slot per row (needed to know where a dragged row lands), taller with large text
  const rowHeight = Math.round(Math.max(64, 22 + 40 * scale)) + GAP;

  const [items, setItems] = useState(initial); // what is still in the list (any order)
  const positions = useSharedValue<Positions>(indexPositions(initial.map((d) => d.id)));
  const count = useSharedValue(initial.length);

  // Current order, read from the positions the drags have changed
  function orderedIds(): number[] {
    const current = positions.get();
    return items.map((d) => d.id).sort((a, b) => current[a] - current[b]);
  }

  function remove(id: number) {
    const next = orderedIds().filter((other) => other !== id);
    positions.set(indexPositions(next));
    count.set(next.length);
    setItems((list) => list.filter((d) => d.id !== id));
  }

  // VoiceOver: "Sposta su" / "Sposta giù" instead of dragging
  function moveBy(id: number, delta: number) {
    const ids = orderedIds();
    const from = ids.indexOf(id);
    const to = from + delta;
    if (to < 0 || to >= ids.length) return;
    ids.splice(from, 1);
    ids.splice(to, 0, id);
    positions.set(indexPositions(ids));
  }

  async function save() {
    try {
      await savePinnedOrder(db, orderedIds());
      router.back();
    } catch (error) {
      Alert.alert('Impossibile salvare', error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          {items.length > 0
            ? 'Trascina ≡ per cambiare l’ordine. Tocca − per togliere.'
            : 'Non resta niente: tocca Fine per svuotare Sottomano.'}
        </ThemedText>
        <View style={{ height: items.length * rowHeight }}>
          {items.map((document) => (
            <DraggableRow
              key={document.id}
              document={document}
              positions={positions}
              count={count}
              rowHeight={rowHeight}
              onRemove={() => remove(document.id)}
              onMove={(delta) => moveBy(document.id, delta)}
            />
          ))}
        </View>
      </ScrollView>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" onPress={save}>
          Fine
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

// Moves one row from `from` to `to`; the rows in between shift by one place
function moveIndex(positions: Positions, id: number, to: number): Positions {
  'worklet';
  const from = positions[id];
  const next: Positions = {};
  for (const key of Object.keys(positions)) {
    const otherId = Number(key);
    const index = positions[otherId];
    if (otherId === id) next[otherId] = to;
    else if (from < to && index > from && index <= to) next[otherId] = index - 1;
    else if (from > to && index >= to && index < from) next[otherId] = index + 1;
    else next[otherId] = index;
  }
  return next;
}

type RowProps = {
  document: DocumentListItem;
  positions: SharedValue<Positions>;
  count: SharedValue<number>;
  rowHeight: number;
  onRemove: () => void;
  onMove: (delta: number) => void;
};

// One row, placed by its index; while dragged it follows the finger above the others
function DraggableRow({ document, positions, count, rowHeight, onRemove, onMove }: RowProps) {
  const theme = useTheme();
  const id = document.id;
  const top = useSharedValue(positions.get()[id] * rowHeight);
  const startTop = useSharedValue(0);
  const dragging = useSharedValue(false);

  // Another row moved (or one was removed): slide to the new place
  useAnimatedReaction(
    () => positions.get()[id],
    (index, previous) => {
      if (index !== undefined && index !== previous && !dragging.get()) {
        top.set(withTiming(index * rowHeight, { duration: 180 }));
      }
    },
  );

  const pan = usePanGesture({
    minDistance: 0, // the handle reacts at once, so the list doesn't scroll instead
    onActivate: () => {
      'worklet';
      dragging.set(true);
      startTop.set(top.get());
    },
    onUpdate: (event) => {
      'worklet';
      const max = (count.get() - 1) * rowHeight;
      const y = Math.min(Math.max(startTop.get() + event.translationY, 0), max);
      top.set(y);
      const to = Math.round(y / rowHeight);
      if (to !== positions.get()[id]) positions.set(moveIndex(positions.get(), id, to));
    },
    onFinalize: () => {
      'worklet';
      dragging.set(false);
      top.set(withTiming(positions.get()[id] * rowHeight, { duration: 180 }));
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    top: top.get(),
    zIndex: dragging.get() ? 10 : 0,
    transform: [{ scale: withTiming(dragging.get() ? 1.03 : 1, { duration: 120 }) }],
    boxShadow: dragging.get() ? '0 8px 20px rgba(0, 0, 0, 0.25)' : '0 0 0 rgba(0, 0, 0, 0)',
  }));

  return (
    <Animated.View
      style={[styles.slot, { height: rowHeight }, animatedStyle]}
      accessible
      accessibilityLabel={document.title}
      accessibilityActions={[
        { name: 'up', label: 'Sposta su' },
        { name: 'down', label: 'Sposta giù' },
        { name: 'remove', label: 'Togli da Sottomano' },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'up') onMove(-1);
        else if (event.nativeEvent.actionName === 'down') onMove(1);
        else onRemove();
      }}>
      <View style={[styles.row, { height: rowHeight - GAP, backgroundColor: theme.surface }]}>
        <Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Togli ${document.title}`}>
          <SymbolView name="minus.circle.fill" tintColor={DANGER_COLOR} size={24} />
        </Pressable>
        <Thumb document={document} />
        <View style={styles.texts}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {document.title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {document.category.name}
          </Text>
        </View>
        <GestureDetector gesture={pan}>
          <View style={styles.handle} accessibilityLabel="Trascina per spostare">
            <SymbolView name="line.3.horizontal" tintColor={theme.textSecondary} size={22} />
          </View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}

// Small picture of the item: its photo, the card color, or the category gradient
function Thumb({ document }: { document: DocumentListItem }) {
  const { category } = document;
  if (document.firstImagePath) {
    return <Image source={{ uri: resolveDocumentFile(document.firstImagePath).uri }} style={styles.thumb} contentFit="cover" />;
  }
  if (category.isCards) {
    return <View style={[styles.thumb, { backgroundColor: document.cardColor ?? DEFAULT_CARD_COLOR }]} />;
  }
  return (
    <LinearGradient colors={[category.colors.top, category.colors.bottom]} style={[styles.thumb, styles.thumbIcon]}>
      <SymbolView name={category.symbol} tintColor={category.colors.text} size={16} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 12,
  },
  hint: {
    paddingHorizontal: 4,
  },
  slot: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 14,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  thumb: {
    width: 48,
    height: 30, // card proportions
    borderRadius: 5,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  thumbIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  handle: {
    width: 52,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
