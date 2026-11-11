import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { SymbolView } from 'expo-symbols';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR, FONTS } from '@/constants/brand';
import { PALETTES, type Palette } from '@/constants/palettes';
import { BUILTIN_ORDER } from '@/db/builtin-categories';
import { restoreBuiltinCategories } from '@/db/categories';
import { useTheme } from '@/hooks/use-theme';
import { setPaletteId, usePaletteId } from '@/settings/palette';

const MINI_COLUMNS = 7; // 13 mini tiles: a row of 7 and a row of 6

// "Aspetto" (Menu › Impostazioni): 6 palettes for the built-in categories, each previewed as a
// mini grid of the 13 category tiles. A tap applies it at once to the whole app.
export default function AppearanceScreen() {
  const db = useSQLiteContext();
  const selected = usePaletteId();

  // Brings back the deleted built-in categories (original name, icon, color), before "Altro"
  function restoreCategories() {
    Alert.alert(
      'Ripristinare le categorie predefinite?',
      'Tornano quelle che hai eliminato, con nome, icona e colore originali. I documenti e le categorie create da te non cambiano.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Ripristina',
          onPress: async () => {
            try {
              const count = await restoreBuiltinCategories(db);
              Alert.alert(
                count === 0 ? 'Niente da ripristinare' : 'Categorie ripristinate',
                count === 0
                  ? 'Tutte le categorie predefinite sono già nella Home.'
                  : count === 1
                    ? '1 categoria è tornata nella Home, prima di «Altro».'
                    : `${count} categorie sono tornate nella Home, prima di «Altro».`,
              );
            } catch (error) {
              Alert.alert('Impossibile ripristinare', error instanceof Error ? error.message : String(error));
            }
          },
        },
      ],
    );
  }

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
          I colori delle categorie predefinite. Le categorie create da te mantengono il loro colore.
        </ThemedText>
        <View accessibilityRole="radiogroup" style={styles.list}>
          {PALETTES.map((palette) => (
            <PaletteCard
              key={palette.id}
              palette={palette}
              selected={palette.id === selected}
              onPress={() => setPaletteId(palette.id)}
            />
          ))}
        </View>
        <View style={styles.restore}>
          <SecondaryButton label="Ripristina categorie predefinite" symbol="arrow.counterclockwise" onPress={restoreCategories} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
            Rimette le categorie predefinite che hai eliminato.
          </ThemedText>
        </View>
      </ScrollView>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" onPress={() => router.back()}>
          Fine
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

function PaletteCard({ palette, selected, onPress }: { palette: Palette; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`Palette ${palette.name}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.surface, borderColor: selected ? BRAND_COLOR : 'transparent' },
        pressed && styles.pressed,
      ]}>
      <View style={styles.cardHeader}>
        <ThemedText style={styles.name}>{palette.name}</ThemedText>
        {selected && <SymbolView name="checkmark.circle.fill" tintColor={BRAND_COLOR} size={22} />}
      </View>
      <View style={styles.grid}>
        {[0, MINI_COLUMNS].map((start) => (
          <View key={start} style={styles.row}>
            {Array.from({ length: MINI_COLUMNS }, (_, column) => {
              const index = start + column;
              const colors = palette.colors[index];
              // The last cell is empty, so the tiles of the second row keep the same width
              if (!colors) return <View key="empty" style={styles.mini} />;
              const { symbol } = BUILTIN_ORDER[index];
              return (
                <LinearGradient key={symbol} colors={[colors.top, colors.bottom]} style={styles.mini}>
                  <SymbolView name={symbol} tintColor={colors.text} size={14} />
                </LinearGradient>
              );
            })}
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 12,
  },
  intro: {
    paddingHorizontal: 4,
  },
  list: {
    gap: 12,
  },
  restore: {
    marginTop: 12,
    gap: 8,
  },
  card: {
    padding: 14,
    gap: 12,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 17,
    fontFamily: FONTS.titleSemiBold,
  },
  grid: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  mini: {
    flex: 1, // equal tiles in every row
    aspectRatio: 1.1,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
