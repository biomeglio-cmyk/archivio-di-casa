import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { SymbolView } from 'expo-symbols';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR } from '@/constants/brand';
import { cardSurface, Spacing, type Palette as ThemePalette } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { PALETTES, paletteName, type Palette } from '@/constants/palettes';
import { BUILTIN_ORDER } from '@/db/builtin-categories';
import { restoreBuiltinCategories } from '@/db/categories';
import { setPaletteId, usePaletteId } from '@/settings/palette';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

const MINI_COLUMNS = 7; // 13 mini tiles: a row of 7 and a row of 6

// "Aspetto" (Menu › Impostazioni): 7 palettes for the built-in categories ("Sottomano" first), each previewed as a
// mini grid of the 13 category tiles. A tap applies it at once to the whole app.
export default function AppearanceScreen() {
  const styles = useThemedStyles(makeStyles);
  const db = useSQLiteContext();
  const { t } = useI18n();
  const selected = usePaletteId();

  // Brings back the deleted built-in categories (original name, icon, color), before "Altro"
  function restoreCategories() {
    Alert.alert(
      t('appearance.alerts.restoreTitle'),
      t('appearance.alerts.restoreMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.restore'),
          onPress: async () => {
            try {
              const count = await restoreBuiltinCategories(db);
              Alert.alert(
                count === 0 ? t('appearance.alerts.nothingTitle') : t('appearance.alerts.restoredTitle'),
                count === 0
                  ? t('appearance.alerts.nothingMessage')
                  : t('appearance.alerts.restoredMessage', { count }),
              );
            } catch (error) {
              Alert.alert(t('appearance.alerts.restoreFailed'), error instanceof Error ? error.message : String(error));
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
          {t('appearance.intro')}
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
          <SecondaryButton label={t('appearance.restoreButton')} symbol="arrow.counterclockwise" onPress={restoreCategories} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
            {t('appearance.restoreHint')}
          </ThemedText>
        </View>
      </ScrollView>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" onPress={() => router.back()}>
          {t('common.done')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

function PaletteCard({ palette, selected, onPress }: { palette: Palette; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={t('appearance.paletteLabel', { name: paletteName(palette.id) })}
      style={({ pressed }) => [
        styles.card,
        cardSurface(theme),
        { borderColor: selected ? BRAND_COLOR(theme) : 'transparent' },
        pressed && styles.pressed,
      ]}>
      <View style={styles.cardHeader}>
        <ThemedText style={styles.name}>{paletteName(palette.id)}</ThemedText>
        {selected && <SymbolView name="checkmark.circle.fill" tintColor={BRAND_COLOR(theme)} size={22} />}
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

const makeStyles = (c: ThemePalette) =>
  StyleSheet.create({
  content: {
    paddingVertical: 16,
    paddingHorizontal: Spacing.side,
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
    fontFamily: FONTS.semiBold,
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
