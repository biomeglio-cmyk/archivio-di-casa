import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/action-sheet';
import { PrimaryButton } from '@/components/primary-button';
import { RoundIconButton } from '@/components/round-icon-button';
import { Text, TextInput } from '@/components/text';
import { GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { CATEGORY_SYMBOLS } from '@/constants/category-options';
import { CardSurface, Colors, Spacing, tintedShadow } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { countDocumentsInCategory, getCategory, insertCategory, updateCategory } from '@/db/categories';
import { listPeople } from '@/db/people';
import type { Category, CategoryColors } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { builtinColorsFor, getPalette } from '@/settings/palette';
import { categoryShadowRgb, categoryTint } from '@/utils/colors';

// The 10 icons of the design first (Animali, Documento, Casa, Auto, Salute, Scuola, Lavoro, Chiavi,
// Viaggi, Spese), then ours
const DESIGN_SYMBOLS: { symbol: SFSymbol; name: string }[] = [
  { symbol: 'pawprint', name: 'Animali' },
  { symbol: 'doc.text', name: 'Documento' },
  { symbol: 'house', name: 'Casa' },
  { symbol: 'car', name: 'Auto' },
  { symbol: 'heart', name: 'Salute' },
  { symbol: 'graduationcap', name: 'Scuola' },
  { symbol: 'briefcase', name: 'Lavoro' },
  { symbol: 'key', name: 'Chiavi' },
  { symbol: 'airplane', name: 'Viaggi' },
  { symbol: 'banknote', name: 'Spese' },
];

// "Nuova categoria" (no id) or "Modifica categoria" (?id=…)
export default function CategoryFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const categoryId = id ? Number(id) : null;
  const { data: category } = useDbQuery(
    (db) => (categoryId ? getCategory(db, categoryId) : Promise.resolve(null)),
    [categoryId],
  );
  const { data: count } = useDbQuery(
    (db) => (categoryId ? countDocumentsInCategory(db, categoryId) : Promise.resolve(0)),
    [categoryId],
  );

  // Editing: wait for the saved values (the form reads its initial values once)
  if (categoryId !== null && (!category || count === undefined)) return null;

  return <CategoryForm category={category ?? null} count={count ?? 0} />;
}

// docs/design/NuovaCategoria.dc.html: back and the title, the live preview (172 × 140 tile), NOME,
// COLORE (our 13 colors of the palette chosen in Aspetto, 38pt circles), ICONA (5 per row, the chosen
// one in the gradient), PER CHI È, and "Crea categoria" in the chosen gradient. Our extras: a
// built-in can keep following Aspetto, more icons after the design's 10; names can hold emoji.
function CategoryForm({ category, count }: { category: Category | null; count: number }) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { data: people } = useDbQuery(listPeople, []);
  const palette = getPalette();
  const [name, setName] = useState(category?.name ?? '');
  const [symbol, setSymbol] = useState<SFSymbol>(category?.symbol ?? DESIGN_SYMBOLS[0].symbol);
  const [colors, setColors] = useState<CategoryColors>(category?.colors ?? palette.colors[1] ?? palette.colors[0]);
  // Built-in only: keep following the palette of "Aspetto" (its own color there)
  const [followPalette, setFollowPalette] = useState(category?.followsPalette ?? false);
  const [personId, setPersonId] = useState<number | null>(category?.personId ?? null);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const builtinKey = category?.builtinKey ?? null;
  const paletteColors = builtinKey ? builtinColorsFor(builtinKey) : null;
  const shown = followPalette && paletteColors ? paletteColors : colors; // what the tile will look like
  const { tint, onTint } = categoryTint(shown);
  const gradient = [shown.top, shown.bottom] as const;
  const shadow = tintedShadow(categoryShadowRgb(shown));
  // Our 13 colors (the palette of Aspetto), without repeats
  const swatches = palette.colors.filter((c, index, all) => all.findIndex((other) => other.bottom === c.bottom) === index);
  // The icons: this category's own first (a built-in's original icon included), the design's, then ours
  const named = new Map(DESIGN_SYMBOLS.map((d) => [d.symbol, d.name]));
  const symbols = [
    ...new Set([category?.symbol, builtinKey as SFSymbol | null, ...DESIGN_SYMBOLS.map((d) => d.symbol), ...CATEGORY_SYMBOLS]),
  ].filter((s): s is SFSymbol => Boolean(s));
  const personName = people?.find((p) => p.id === personId)?.name ?? 'Tutta la famiglia';
  const canSave = name.trim().length > 0 && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      if (category) {
        await updateCategory(db, category.id, { name, symbol, colors: shown, followPalette, personId });
      } else {
        await insertCategory(db, { name, symbol, colors, personId });
      }
      router.back();
    } catch (error) {
      setSaving(false);
      Alert.alert('Impossibile salvare', String(error));
    }
  }

  return (
    <>
      <ScrollView
        style={styles.screen}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + 36 }]}>
        <View style={styles.bar}>
          <RoundIconButton symbol="chevron.left" accessibilityLabel="Indietro" color={Colors.light.text} onPress={() => router.back()} />
          <Text style={styles.heading} accessibilityRole="header">
            {category ? 'Modifica categoria' : 'Nuova categoria'}
          </Text>
          <View style={styles.barSpace} />
        </View>

        {/* Live preview, as the tile will look in Home */}
        <View style={styles.previewRow}>
          <LinearGradient
            colors={gradient}
            start={GRADIENT_START}
            end={GRADIENT_END}
            style={[styles.preview, { boxShadow: shadow }]}
            accessible
            accessibilityRole="image"
            accessibilityLabel="Anteprima della categoria">
            <SymbolView name={symbol} tintColor={shown.text} size={30} />
            <View>
              <Text style={[styles.previewName, { color: shown.text }]} numberOfLines={2}>
                {name.trim() || 'Nome'}
              </Text>
              <Text style={[styles.previewCount, { color: shown.text }]}>
                {count === 1 ? '1 documento' : `${count} documenti`}
              </Text>
            </View>
          </LinearGradient>
        </View>

        <Text style={styles.section}>Nome</Text>
        <View style={styles.field}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Es. Animali"
            placeholderTextColor={Colors.light.textSecondary}
            autoFocus={!category}
            returnKeyType="done"
            accessibilityLabel="Nome della categoria"
            style={styles.input}
          />
        </View>

        <Text style={styles.section}>Colore</Text>
        <View style={styles.colors} accessibilityRole="radiogroup" accessibilityLabel="Colore">
          {/* Built-in: "Come Aspetto" follows the palette chosen in Menu › Aspetto */}
          {paletteColors && (
            <Swatch
              colors={paletteColors}
              label="Colore di Aspetto"
              selected={followPalette}
              onPress={() => setFollowPalette(true)}
              symbol="paintpalette"
            />
          )}
          {swatches.map((swatch, index) => (
            <Swatch
              key={swatch.bottom}
              colors={swatch}
              label={`Colore ${index + 1}`}
              selected={!followPalette && swatch.bottom === colors.bottom}
              onPress={() => {
                setColors(swatch);
                setFollowPalette(false);
              }}
            />
          ))}
        </View>
        {paletteColors && (
          <Text style={styles.hint}>
            {followPalette ? 'Il colore segue la palette scelta in Aspetto.' : 'Colore scelto da te: non cambia con Aspetto.'}
          </Text>
        )}

        <Text style={styles.section}>Icona</Text>
        <View style={styles.icons} accessibilityRole="radiogroup" accessibilityLabel="Icona">
          {symbols.map((s) => {
            const selected = s === symbol;
            return (
              <View key={s} style={styles.iconCell}>
                <Pressable
                  onPress={() => setSymbol(s)}
                  accessibilityRole="radio"
                  accessibilityLabel={named.get(s) ?? s}
                  accessibilityState={{ checked: selected }}
                  style={[styles.icon, { backgroundColor: tint }, selected && { boxShadow: shadow }]}>
                  {selected && (
                    <LinearGradient colors={gradient} start={GRADIENT_START} end={GRADIENT_END} style={[StyleSheet.absoluteFill, styles.iconFill]} />
                  )}
                  <SymbolView name={s} tintColor={selected ? shown.text : onTint} size={22} />
                </Pressable>
              </View>
            );
          })}
        </View>

        <Text style={styles.section}>Per chi è</Text>
        <Pressable
          onPress={() => setPeopleOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Per chi è questa categoria: ${personName}`}
          style={({ pressed }) => [styles.field, styles.select, pressed && styles.pressed]}>
          <Text style={styles.selectText} numberOfLines={1}>
            {personName}
          </Text>
          <SymbolView name="chevron.down" tintColor={Colors.light.textSecondary} size={15} weight="semibold" />
        </Pressable>
        <Text style={styles.hint}>I nuovi documenti di questa categoria partono con questa persona.</Text>

        <PrimaryButton
          label={category ? 'Salva' : 'Crea categoria'}
          disabled={!canSave}
          onPress={save}
          gradient={gradient}
          shadow={`0 10px 22px rgba(${categoryShadowRgb(shown)}, 0.28)`}
          style={styles.save}
        />
      </ScrollView>

      <ActionSheet
        visible={peopleOpen}
        title="Per chi è"
        actions={[
          {
            key: 'all',
            label: 'Tutta la famiglia',
            symbol: personId === null ? 'checkmark.circle.fill' : 'person.2',
            onPress: () => setPersonId(null),
          },
          ...(people ?? []).map((p) => ({
            key: String(p.id),
            label: p.name,
            symbol: p.id === personId ? ('checkmark.circle.fill' as const) : ('person' as const),
            onPress: () => setPersonId(p.id),
          })),
        ]}
        onClose={() => setPeopleOpen(false)}
      />
    </>
  );
}

type SwatchProps = {
  colors: CategoryColors;
  label: string;
  selected: boolean;
  onPress: () => void;
  symbol?: SFSymbol;
};

// A 38pt color circle with a white ring; the chosen one has an outer ring in its color
function Swatch({ colors, label, selected, onPress, symbol }: SwatchProps) {
  return (
    <View style={styles.swatchCell}>
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityLabel={label}
        accessibilityState={{ checked: selected }}
        style={[styles.swatch, selected && { boxShadow: `0 0 0 2px ${colors.bottom}` }]}>
        <LinearGradient colors={[colors.top, colors.bottom]} start={GRADIENT_START} end={GRADIENT_END} style={styles.swatchFill}>
          {symbol && <SymbolView name={symbol} tintColor={colors.text} size={15} />}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  page: {
    paddingTop: 24,
    paddingHorizontal: Spacing.side,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 17,
    fontFamily: FONTS.semiBold,
    color: Colors.light.text,
  },
  barSpace: {
    width: 44,
  },
  previewRow: {
    marginTop: 20,
    alignItems: 'center',
  },
  preview: {
    width: 172,
    height: 140,
    padding: 16,
    borderRadius: 24,
    borderCurve: 'continuous',
    justifyContent: 'space-between',
  },
  previewName: {
    fontSize: 17,
    fontFamily: FONTS.semiBold,
  },
  previewCount: {
    fontSize: 13,
    fontFamily: FONTS.regular,
  },
  section: {
    marginTop: 24,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: Colors.light.textSecondary,
  },
  field: {
    ...CardSurface,
    marginTop: 10,
    height: 56,
    borderRadius: 18,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: Colors.light.text,
  },
  colors: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  swatchCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
  },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  swatchFill: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    marginTop: 8,
    marginHorizontal: 4,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
  },
  icons: {
    marginTop: 12,
    marginHorizontal: -5,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
  },
  iconCell: {
    width: '20%',
    paddingHorizontal: 5,
  },
  icon: {
    height: 56,
    borderRadius: 16,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFill: {
    borderRadius: 16,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectText: {
    flexShrink: 1,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: Colors.light.text,
  },
  pressed: {
    opacity: 0.7,
  },
  save: {
    marginTop: 26,
  },
});
