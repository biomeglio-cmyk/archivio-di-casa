import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormField, TextField } from '@/components/form-field';
import { GradientButton } from '@/components/gradient-button';
import { ThemedText } from '@/components/themed-text';
import { FONTS } from '@/constants/brand';
import { CATEGORY_PALETTES, CATEGORY_SYMBOLS } from '@/constants/category-options';
import { getCategory, insertCategory, updateCategory } from '@/db/categories';
import type { Category, CategoryColors } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';

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
  const [colors, setColors] = useState<CategoryColors>(category?.colors ?? CATEGORY_PALETTES[0]);
  const [saving, setSaving] = useState(false);

  // Built-in categories can only be renamed
  const canStyle = !category?.isBuiltin;
  const canSave = name.trim().length > 0 && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      if (category) {
        await updateCategory(db, category.id, { name, symbol, colors });
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
      <LinearGradient colors={[colors.top, colors.bottom]} style={styles.preview}>
        <SymbolView name={symbol} tintColor={colors.text} size={28} />
        <Text style={[styles.previewName, { color: colors.text }]} numberOfLines={2}>
          {name.trim() || 'Nome della categoria'}
        </Text>
      </LinearGradient>

      <FormField label="Nome" required>
        <TextField value={name} onChangeText={setName} placeholder="Es. Animali" autoFocus={!category} returnKeyType="done" />
      </FormField>

      {canStyle ? (
        <>
          <FormField label="Icona">
            <View style={styles.grid}>
              {CATEGORY_SYMBOLS.map((s) => {
                const selected = s === symbol;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setSymbol(s)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.iconCell,
                      { backgroundColor: selected ? colors.bottom : theme.backgroundElement },
                    ]}>
                    <SymbolView name={s} tintColor={selected ? colors.text : theme.textSecondary} size={22} />
                  </Pressable>
                );
              })}
            </View>
          </FormField>

          <FormField label="Colore">
            <View style={styles.grid}>
              {CATEGORY_PALETTES.map((p) => {
                const selected = p.bottom === colors.bottom;
                return (
                  <Pressable
                    key={p.bottom}
                    onPress={() => setColors(p)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.swatch, selected && { borderColor: p.text }]}>
                    <LinearGradient colors={[p.top, p.bottom]} style={styles.swatchFill} />
                  </Pressable>
                );
              })}
            </View>
          </FormField>
        </>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Le categorie di base si possono rinominare; icona e colore restano quelli originali.
        </ThemedText>
      )}

      <GradientButton label="Salva" disabled={!canSave} onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 20,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: FONTS.titleBold,
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
    fontFamily: FONTS.titleSemiBold,
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
  swatchFill: {
    flex: 1,
    borderRadius: 16,
  },
});
