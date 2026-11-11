import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DANGER_COLOR } from '@/constants/brand';
import { DEFAULT_CARD_COLOR } from '@/constants/card-colors';
import { listPinnedDocuments, savePinnedOrder } from '@/db/documents';
import type { DocumentListItem } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { resolveDocumentFile } from '@/storage/document-files';

const MAX_FONT_SCALE = 2; // text grows up to 2×, then stops

// Modal "Modifica" of the Preferiti tab: red − to remove. The order is changed in the tab itself
// (long press and drag a tile). Removals are saved only with "Fine"; "Annulla" leaves them as they were.
export default function PinnedEditScreen() {
  const { data: pinned } = useDbQuery(listPinnedDocuments, []);

  return (
    <>
      {/* The editor reads the list once, so it appears only after loading */}
      {pinned && <PinnedEditor initial={pinned} />}
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()}>Annulla</Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

function PinnedEditor({ initial }: { initial: DocumentListItem[] }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [items, setItems] = useState(initial); // what is still in the list, in the saved order

  async function save() {
    try {
      await savePinnedOrder(db, items.map((d) => d.id));
      router.back();
    } catch (error) {
      Alert.alert('Impossibile salvare', error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          {initial.length === 0
            ? 'Nessun preferito. Tocca il cuore su una carta o un documento per aggiungerlo.'
            : items.length > 0
              ? 'Tocca − per togliere. Per cambiare l’ordine, nella griglia dei Preferiti tieni premuto un preferito e trascinalo.'
              : 'Non resta niente: tocca Fine per svuotare i Preferiti.'}
        </ThemedText>
        <View style={styles.list}>
          {items.map((document) => (
            <View key={document.id} style={[styles.row, { backgroundColor: theme.surface }]}>
              <Pressable
                onPress={() => setItems((list) => list.filter((d) => d.id !== document.id))}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Togli ${document.title}`}>
                <SymbolView name="minus.circle.fill" tintColor={DANGER_COLOR} size={24} />
              </Pressable>
              <Thumb document={document} />
              <View style={styles.texts}>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {document.title}
                </Text>
                <Text
                  style={[styles.subtitle, { color: theme.textSecondary }]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={MAX_FONT_SCALE}>
                  {document.category.name}
                </Text>
              </View>
            </View>
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
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 12,
  },
  hint: {
    paddingHorizontal: 4,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
});
