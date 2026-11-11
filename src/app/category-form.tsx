import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { FormField, TextField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { CATEGORY_PALETTES, CATEGORY_SYMBOLS } from '@/constants/category-options';
import { getCategory, insertCategory, updateCategory } from '@/db/categories';
import type { Category, CategoryColors } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { builtinColorsFor, getPalette } from '@/settings/palette';

// Sheet for a category: "Nuova categoria" (no id) or "Modifica categoria" (?id=…)
export default function CategoryFormSheet() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const categoryId = id ? Number(id) : null;
  const { data: category } = useDbQuery(
    (db) => (categoryId ? getCategory(db, categoryId) : Promise.resolve(null)),
    [categoryId],
  );

  // Editing: wait for the saved values (the form reads its initial values once)
  if (categoryId !== null && !category) return null;

  return <CategoryForm category={category ?? null} />;
}

function CategoryForm({ category }: { category: Category | null }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [name, setName] = useState(category?.name ?? '');
  const [symbol, setSymbol] = useState<SFSymbol>(category?.symbol ?? CATEGORY_SYMBOLS[0]);
  const palette = getPalette();
  const [colors, setColors] = useState<CategoryColors>(category?.colors ?? palette.colors[0]);
  // Built-in only: keep following the palette of "Aspetto" (its own color there)
  const [followPalette, setFollowPalette] = useState(category?.followsPalette ?? false);
  const [saving, setSaving] = useState(false);

  const builtinKey = category?.builtinKey ?? null;
  const paletteColors = builtinKey ? builtinColorsFor(builtinKey) : null;
  const shown = followPalette && paletteColors ? paletteColors : colors; // what the tile will look like
  // The icons to choose from: this category's own first (a built-in's original icon included)
  const symbols = [...new Set([category?.symbol, builtinKey as SFSymbol | null, ...CATEGORY_SYMBOLS])].filter(
    (s): s is SFSymbol => Boolean(s),
  );
  // Colors: the palette chosen in "Aspetto", then the pastel ones (no duplicates)
  const swatches = [...palette.colors, ...CATEGORY_PALETTES].filter(
    (c, index, all) => all.findIndex((other) => other.bottom === c.bottom) === index,
  );
  const canSave = name.trim().length > 0 && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      if (category) {
        await updateCategory(db, category.id, { name, symbol, colors: shown, followPalette });
      } else {
        await insertCategory(db, { name, symbol, colors });
      }
      router.back();
    } catch (error) {
      setSaving(false);
      Alert.alert('Impossibile salvare', String(error));
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <ThemedText style={styles.title}>{category ? 'Modifica categoria' : 'Nuova categoria'}</ThemedText>

      {/* Live preview, same look as the archive tiles */}
      <LinearGradient colors={[shown.top, shown.bottom]} style={styles.preview}>
        <SymbolView name={symbol} tintColor={shown.text} size={28} />
        <Text style={[styles.previewName, { color: shown.text }]} numberOfLines={2}>
          {name.trim() || 'Nome della categoria'}
        </Text>
      </LinearGradient>

      <FormField label="Nome" required>
        <TextField value={name} onChangeText={setName} placeholder="Es. Animali" autoFocus={!category} returnKeyType="done" />
      </FormField>

      <FormField label="Icona">
        <View style={styles.grid}>
          {symbols.map((s) => {
            const selected = s === symbol;
            return (
              <Pressable
                key={s}
                onPress={() => setSymbol(s)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.iconCell, { backgroundColor: selected ? shown.bottom : theme.lilac }]}>
                <SymbolView name={s} tintColor={selected ? shown.text : theme.textSecondary} size={22} />
              </Pressable>
            );
          })}
        </View>
      </FormField>

      <FormField label="Colore">
        <View style={styles.grid}>
          {/* Built-in: "Come Aspetto" follows the palette chosen in Menu › Aspetto */}
          {paletteColors && (
            <Pressable
              onPress={() => setFollowPalette(true)}
              accessibilityRole="button"
              accessibilityLabel="Colore di Aspetto"
              accessibilityState={{ selected: followPalette }}
              style={[styles.swatch, followPalette && { borderColor: paletteColors.text }]}>
              <LinearGradient colors={[paletteColors.top, paletteColors.bottom]} style={[styles.swatchFill, styles.auto]}>
                <SymbolView name="paintpalette" tintColor={paletteColors.text} size={16} />
              </LinearGradient>
            </Pressable>
          )}
          {swatches.map((p) => {
            const selected = !followPalette && p.bottom === colors.bottom;
            return (
              <Pressable
                key={p.bottom}
                onPress={() => {
                  setColors(p);
                  setFollowPalette(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.swatch, selected && { borderColor: p.text }]}>
                <LinearGradient colors={[p.top, p.bottom]} style={styles.swatchFill} />
              </Pressable>
            );
          })}
        </View>
        {paletteColors && (
          <ThemedText type="small" themeColor="textSecondary">
            {followPalette ? 'Il colore segue la palette scelta in Aspetto.' : 'Colore scelto da te: non cambia con Aspetto.'}
          </ThemedText>
        )}
      </FormField>

      <PrimaryButton label="Salva" disabled={!canSave} onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.side,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 20,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: FONTS.bold,
  },
  preview: {
    height: 110,
    padding: 14,
    borderRadius: 20,
    borderCurve: 'continuous',
    justifyContent: 'space-between',
  },
  previewName: {
    fontSize: 17,
    lineHeight: 21,
    fontFamily: FONTS.semiBold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconCell: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
    padding: 3,
  },
  auto: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchFill: {
    flex: 1,
    borderRadius: 16,
  },
});
