import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CARD_ASPECT_RATIO } from '@/capture/guide-frame';
import { CardFace } from '@/components/card-face';
import { BRAND_COLOR, PIN_COLOR } from '@/constants/brand';
import { listPinnedDocuments } from '@/db/documents';
import type { DocumentListItem } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { usePressed } from '@/hooks/use-pressed';
import { useTheme } from '@/hooks/use-theme';
import { resolveDocumentFile } from '@/storage/document-files';

const MINI_WIDTH = 140;
const MINI_HEIGHT = Math.round(MINI_WIDTH / CARD_ASPECT_RATIO);
const EDGE = 16; // the grid padding: the row scrolls from edge to edge of the screen

// "SOTTOMANO" on Archivio, between the search bar and the categories: the pinned cards and
// documents as small cards in a horizontal row, in the order chosen with "Modifica"
export function PinnedStrip() {
  const theme = useTheme();
  const { data: pinned } = useDbQuery(listPinnedDocuments, []);

  if (!pinned) return null; // loading: a few milliseconds

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textSecondary }]}>Sottomano</Text>
        {pinned.length > 0 && (
          <Pressable onPress={() => router.push('/pinned-edit')} hitSlop={10} accessibilityRole="button">
            <Text style={styles.edit}>Modifica</Text>
          </Pressable>
        )}
      </View>

      {pinned.length === 0 ? (
        <View style={[styles.empty, { borderColor: theme.textSecondary }]}>
          <SymbolView name="star" tintColor={PIN_COLOR} size={20} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Tocca la stellina su una carta per tenerla qui
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scroller}
          contentContainerStyle={styles.row}>
          {pinned.map((document) => (
            <MiniCard key={document.id} document={document} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function MiniCard({ document }: { document: DocumentListItem }) {
  const theme = useTheme();
  const { pressed, handlers } = usePressed();
  const { category } = document;

  return (
    <Pressable
      {...handlers}
      onPress={() => router.push({ pathname: '/(tabs)/(archive)/document/[id]', params: { id: String(document.id) } })}
      accessibilityRole="button"
      accessibilityLabel={document.title}
      style={[styles.mini, pressed && styles.pressed]}>
      {category.isCards ? (
        <CardFace card={document} width={MINI_WIDTH} />
      ) : document.firstImagePath ? (
        <Image
          source={{ uri: resolveDocumentFile(document.firstImagePath).uri }}
          style={styles.shape}
          contentFit="cover"
          transition={120}
        />
      ) : (
        <LinearGradient colors={[category.colors.top, category.colors.bottom]} style={[styles.shape, styles.gradient]}>
          <SymbolView name={category.symbol} tintColor={category.colors.text} size={22} />
          <Text style={[styles.gradientTitle, { color: category.colors.text }]} numberOfLines={2} maxFontSizeMultiplier={1.3}>
            {document.title}
          </Text>
        </LinearGradient>
      )}
      <Text style={[styles.caption, { color: theme.text }]} numberOfLines={1}>
        {document.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
    marginBottom: 8, // a little more room before the categories
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 13,
    lineHeight: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  edit: {
    color: BRAND_COLOR,
    fontSize: 17,
  },
  scroller: {
    marginHorizontal: -EDGE,
  },
  row: {
    gap: 12,
    paddingHorizontal: EDGE,
  },
  mini: {
    width: MINI_WIDTH,
    gap: 6,
  },
  pressed: {
    opacity: 0.8,
  },
  shape: {
    width: MINI_WIDTH,
    height: MINI_HEIGHT,
    borderRadius: 12,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  gradient: {
    padding: 10,
    justifyContent: 'space-between',
  },
  gradientTitle: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: 600,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 2,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  emptyText: {
    flex: 1,
    fontSize: 15,
  },
});
