import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/action-sheet';
import { ColorPicker } from '@/components/color-picker';
import { FitLine } from '@/components/fit-line';
import { IconSquare } from '@/components/icon-square';
import { PrimaryButton } from '@/components/primary-button';
import { RoundIconButton } from '@/components/round-icon-button';
import { Text, TextInput } from '@/components/text';
import { GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { CATEGORY_SYMBOLS } from '@/constants/category-options';
import { cardSurface, type Palette, Spacing, tintedShadow } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import {
  countDocumentsInCategory,
  getCategory,
  insertCategory,
  listHiddenBuiltinCategories,
  nameToStore,
  restoreBuiltinCategory,
  updateCategory,
} from '@/db/categories';
import { listPeople } from '@/db/people';
import type { Category, CategoryColors } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { builtinColorsFor, getPalette } from '@/settings/palette';
import { categoryShadowRgb, categoryTint, colorsFromHex, readableColors, readableGradient, tileFrame, tileGradientPoints } from '@/utils/colors';
import { useLargeText } from '@/hooks/use-large-text';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

// The 10 icons of the design first (Animali, Documento, Casa, Auto, Salute, Scuola, Lavoro, Chiavi,
// Viaggi, Spese), then ours. `name` is the key of the spoken name in categoryForm.icons.
const DESIGN_SYMBOLS: { symbol: SFSymbol; name: string }[] = [
  { symbol: 'pawprint', name: 'pets' },
  { symbol: 'doc.text', name: 'document' },
  { symbol: 'house', name: 'home' },
  { symbol: 'car', name: 'car' },
  { symbol: 'heart', name: 'health' },
  { symbol: 'graduationcap', name: 'school' },
  { symbol: 'briefcase', name: 'work' },
  { symbol: 'key', name: 'keys' },
  { symbol: 'airplane', name: 'travel' },
  { symbol: 'banknote', name: 'expenses' },
];

// VoiceOver names of the other icons (ours and the built-ins' own), never the SF Symbol name:
// keys in a11y.categoryForm.icons
const OTHER_SYMBOL_NAMES: Partial<Record<SFSymbol, string>> = {
  folder: 'folder',
  tag: 'tag',
  star: 'star',
  gift: 'gift',
  'wrench.and.screwdriver': 'tools',
  cart: 'cart',
  stethoscope: 'stethoscope',
  dumbbell: 'fitness',
  'music.note': 'music',
  book: 'book',
  'person.text.rectangle': 'idCard',
  creditcard: 'card',
  lightbulb: 'lightbulb',
  shield: 'shield',
  receipt: 'receipt',
  'cross.case': 'firstAid',
  'bubbles.and.sparkles': 'cleaning',
  backpack: 'backpack',
};

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
// COLORE (our 13 colors of the palette chosen in Aspetto, 38pt circles, and "Il tuo colore"), ICONA (5 per row, the chosen
// one in the gradient), PER CHI È, and "Crea categoria" in the chosen gradient. Our extras: a
// built-in can keep following Aspetto, more icons after the design's 10; names can hold emoji;
// at the top, "Ripristina una categoria predefinita" for the built-ins removed with Cancella.
function CategoryForm({ category, count }: { category: Category | null; count: number }) {
  const { t } = useI18n();
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { data: people } = useDbQuery(listPeople, []);
  const { data: hiddenBuiltins } = useDbQuery(listHiddenBuiltinCategories, []);
  const palette = getPalette();
  const [name, setName] = useState(category?.name ?? '');
  const [symbol, setSymbol] = useState<SFSymbol>(category?.symbol ?? DESIGN_SYMBOLS[0].symbol);
  const [colors, setColors] = useState<CategoryColors>(category?.colors ?? palette.colors[1] ?? palette.colors[0]);
  // Built-in only: keep following the palette of "Aspetto" (its own color there)
  const [followPalette, setFollowPalette] = useState(category?.followsPalette ?? false);
  const [personId, setPersonId] = useState<number | null>(category?.personId ?? null);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [wheelDragging, setWheelDragging] = useState(false); // a finger on the color wheel: no scroll

  const builtinKey = category?.builtinKey ?? null;
  // The palette colors (light theme, what Aspetto chooses); in Tema notte the night folder
  const paletteColors = builtinKey ? builtinColorsFor(builtinKey, undefined, theme.isDark) : null;
  const shown = followPalette && paletteColors ? paletteColors : colors; // what the tile will look like
  const { tint, onTint } = categoryTint(shown, theme);
  // As Home shows it: readable at WCAG AA (dark ink on the pastel ones, see utils/colors.ts)
  const look = readableColors(shown);
  const gradient = [look.top, look.bottom] as const;
  const { fontScale } = useWindowDimensions();
  const largeText = useLargeText(); // icons: 4 per row instead of 5; row icons above their text
  const shadow = tintedShadow(categoryShadowRgb(look));
  // Our 13 colors (the palette of Aspetto), without repeats
  const swatches = palette.colors.filter((c, index, all) => all.findIndex((other) => other.bottom === c.bottom) === index);
  // The icons: this category's own first (a built-in's original icon included), the design's, then ours
  const named = new Map<SFSymbol, string>(DESIGN_SYMBOLS.map((d) => [d.symbol, t(`categoryForm.icons.${d.name}`)]));
  for (const [s, key] of Object.entries(OTHER_SYMBOL_NAMES) as [SFSymbol, string][]) {
    if (!named.has(s)) named.set(s, t(`a11y.categoryForm.icons.${key}`));
  }
  const symbols = [
    ...new Set([category?.symbol, builtinKey as SFSymbol | null, ...DESIGN_SYMBOLS.map((d) => d.symbol), ...CATEGORY_SYMBOLS]),
  ].filter((s): s is SFSymbol => Boolean(s));
  const personName = people?.find((p) => p.id === personId)?.name ?? t('common.wholeFamily');
  const canSave = name.trim().length > 0 && !saving;

  // "Ripristina": the built-in comes back as it was (its forms, color and icon), before "Altro"
  async function restore(builtin: Category) {
    try {
      await restoreBuiltinCategory(db, builtin.id);
      router.back();
    } catch (error) {
      Alert.alert(t('categoryForm.restoreFailed'), String(error));
    }
  }

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      if (category) {
        await updateCategory(db, category.id, { name: nameToStore(category.builtinKey, name), symbol, colors: shown, followPalette, personId });
      } else {
        await insertCategory(db, { name, symbol, colors, personId });
      }
      router.back();
    } catch (error) {
      setSaving(false);
      Alert.alert(t('personForm.saveFailed'), String(error));
    }
  }

  return (
    <>
      {/* While the finger is on the color wheel the sheet can't be swiped down */}
      <Stack.Screen options={{ gestureEnabled: !wheelDragging }} />
      <ScrollView
        style={styles.screen}
        scrollEnabled={!wheelDragging}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + 36 }]}>
        <View style={styles.bar}>
          <RoundIconButton symbol="chevron.left" accessibilityLabel={t('common.back')} color={theme.text} onPress={() => router.back()} />
          <Text style={styles.heading} accessibilityRole="header">
            {category ? t('categoryForm.editTitle') : t('categoryForm.newTitle')}
          </Text>
          <View style={styles.barSpace} />
        </View>

        {/* New category only: the built-ins removed with "Cancella categoria" can come back */}
        {!category && hiddenBuiltins && hiddenBuiltins.length > 0 && (
          <>
            <Text style={styles.section} accessibilityRole="header">
              {t('categoryForm.restoreSection')}
            </Text>
            <View style={styles.restoreCard}>
              {hiddenBuiltins.map((builtin, index) => (
                <Pressable
                  key={builtin.id}
                  onPress={() => restore(builtin)}
                  accessibilityRole="button"
                  accessibilityLabel={t('categoryForm.restoreA11y', { name: builtin.name })}
                  style={({ pressed }) => [
                    styles.restoreRow,
                    largeText && styles.stackLarge,
                    index > 0 && styles.restoreDivider,
                    pressed && styles.pressed,
                  ]}>
                  <IconSquare symbol={builtin.symbol} colors={builtin.colors} size={40} />
                  {largeText ? (
                    // Large text: the name on the whole width, "Ripristina" next to it when it fits, else under it
                    <FitLine
                      style={styles.fillLarge}
                      start={<Text style={[styles.restoreName, styles.nameLarge]}>{builtin.name}</Text>}
                      end={<Text style={styles.restoreAction}>{t('common.restore')}</Text>}
                    />
                  ) : (
                    <>
                      <Text style={styles.restoreName} numberOfLines={fontScale > 1.3 ? undefined : 1}>
                        {builtin.name}
                      </Text>
                      <Text style={styles.restoreAction}>{t('common.restore')}</Text>
                    </>
                  )}
                </Pressable>
              ))}
            </View>
            <Text style={styles.hint}>{t('categoryForm.restoreHint')}</Text>
          </>
        )}

        {/* Live preview, as the tile will look in Home */}
        <View style={styles.previewRow}>
          <LinearGradient
            colors={gradient}
            {...tileGradientPoints(look)}
            style={[styles.preview, largeText && styles.previewLarge, { boxShadow: shadow }, tileFrame(look)]}
            accessible
            accessibilityRole="image"
            accessibilityLabel={[t('categoryForm.previewA11y'), name.trim(), t('common.documents', { count })].filter(Boolean).join(', ')}>
            {largeText ? (
              // As the Home tile in one column: icon and count at the top, the name at the bottom
              <>
                <View style={styles.previewTop}>
                  <SymbolView name={symbol} tintColor={look.text} size={28} />
                  <Text style={[styles.previewTopCount, { color: look.text }]}>{t('common.documents', { count })}</Text>
                </View>
                <Text style={[styles.previewName, { color: look.text }]}>{name.trim() || t('personForm.name')}</Text>
              </>
            ) : (
              <>
                <SymbolView name={symbol} tintColor={look.text} size={30} />
                <View>
                  <Text style={[styles.previewName, { color: look.text }]} numberOfLines={fontScale > 1.3 ? undefined : 2}>
                    {name.trim() || t('personForm.name')}
                  </Text>
                  <Text style={[styles.previewCount, { color: look.text }]}>
                    {t('common.documents', { count })}
                  </Text>
                </View>
              </>
            )}
          </LinearGradient>
        </View>

        {/* The field says "Nome della categoria" itself */}
        <Text style={styles.section} accessibilityElementsHidden importantForAccessibility="no">
          {t('personForm.name')}
        </Text>
        <View style={styles.field}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('categoryForm.namePlaceholder')}
            placeholderTextColor={theme.placeholder}
            autoFocus={!category}
            returnKeyType="done"
            accessibilityLabel={t('categoryForm.nameA11y')}
            style={styles.input}
          />
        </View>

        <Text style={styles.section} accessibilityRole="header">
          {t('categoryForm.color')}
        </Text>
        <View style={styles.colors}>
          <ColorPicker
            presets={[
              // Built-in: "Colore di Aspetto" follows the palette chosen in Menu › Aspetto
              ...(paletteColors
                ? [
                    {
                      key: 'palette',
                      name: t('categoryForm.paletteColor'),
                      colors: [paletteColors.top, paletteColors.bottom] as const,
                      symbol: 'paintpalette' as const,
                      symbolColor: paletteColors.text,
                    },
                  ]
                : []),
              ...swatches.map((swatch, index) => ({
                key: swatch.bottom,
                name: t('categoryForm.colorNumber', { number: index + 1 }),
                colors: [swatch.top, swatch.bottom] as const,
              })),
            ]}
            value={followPalette && paletteColors ? 'palette' : colors.bottom}
            onChange={(value) => {
              if (value === 'palette') {
                setFollowPalette(true);
                return;
              }
              setFollowPalette(false);
              // A preset of the palette, or "Il tuo colore": the whole set derived from the hex
              setColors(swatches.find((swatch) => swatch.bottom === value) ?? colorsFromHex(value));
            }}
            size={38}
            columns={7}
            onDraggingChange={setWheelDragging}
          />
        </View>
        {paletteColors && (
          <Text style={styles.hint}>
            {followPalette ? t('categoryForm.followsPaletteHint') : t('categoryForm.ownColorHint')}
          </Text>
        )}

        <Text style={styles.section} accessibilityRole="header">
          {t('categoryForm.icon')}
        </Text>
        <View style={styles.icons} accessibilityRole="radiogroup" accessibilityLabel={t('categoryForm.icon')}>
          {symbols.map((s, index) => {
            const selected = s === symbol;
            return (
              <View key={s} style={[styles.iconCell, largeText && styles.iconCellLarge]}>
                <Pressable
                  onPress={() => setSymbol(s)}
                  accessibilityRole="radio"
                  accessibilityLabel={named.get(s) ?? t('a11y.categoryForm.iconNumber', { number: index + 1 })}
                  accessibilityState={{ checked: selected }}
                  style={[styles.icon, { backgroundColor: tint }, selected && { boxShadow: shadow }]}>
                  {selected && (
                    <LinearGradient colors={gradient} start={GRADIENT_START} end={GRADIENT_END} style={[StyleSheet.absoluteFill, styles.iconFill]} />
                  )}
                  <SymbolView name={s} tintColor={selected ? look.text : onTint} size={22} />
                  {/* The chosen one: a tick too, not only the gradient */}
                  {selected && (
                    <View style={styles.iconTick}>
                      <SymbolView name="checkmark.circle.fill" tintColor={look.text} size={14} />
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* The button says "Per chi è questa categoria: …" itself */}
        <Text style={styles.section} accessibilityElementsHidden importantForAccessibility="no">
          {t('categoryForm.forWhom')}
        </Text>
        <Pressable
          onPress={() => setPeopleOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('categoryForm.forWhomA11y', { name: personName })}
          accessibilityHint={t('categoryForm.forWhomHint')}
          style={({ pressed }) => [styles.field, styles.select, pressed && styles.pressed]}>
          <Text style={styles.selectText} numberOfLines={fontScale > 1.3 ? undefined : 1}>
            {personName}
          </Text>
          <SymbolView name="chevron.down" tintColor={theme.textSecondary} size={15} weight="semibold" />
        </Pressable>
        {/* Read as the hint of the button above */}
        <Text style={styles.hint} accessibilityElementsHidden importantForAccessibility="no">
          {t('categoryForm.forWhomHint')}
        </Text>

        <PrimaryButton
          label={category ? t('common.save') : t('categoryForm.create')}
          disabled={!canSave}
          onPress={save}
          gradient={readableGradient(gradient)}
          shadow={`0 10px 22px rgba(${categoryShadowRgb(look)}, 0.28)`}
          style={styles.save}
        />
      </ScrollView>

      <ActionSheet
        visible={peopleOpen}
        title={t('categoryForm.forWhom')}
        actions={[
          {
            key: 'all',
            label: t('common.wholeFamily'),
            symbol: 'person.2',
            selected: personId === null,
            onPress: () => setPersonId(null),
          },
          ...(people ?? []).map((p) => ({
            key: String(p.id),
            label: p.name,
            symbol: 'person' as const,
            selected: p.id === personId,
            onPress: () => setPersonId(p.id),
          })),
        ]}
        onClose={() => setPeopleOpen(false)}
      />
    </>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
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
    color: c.text,
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
    minHeight: 140,
    padding: 16,
    borderRadius: 24,
    borderCurve: 'continuous',
    justifyContent: 'space-between',
  },
  previewLarge: {
    alignSelf: 'stretch',
    width: undefined,
    minHeight: 128,
    gap: 14,
  },
  previewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewTopCount: {
    flexShrink: 1,
    fontSize: 17,
    fontFamily: FONTS.semiBold,
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
    color: c.textSecondary,
  },
  field: {
    ...cardSurface(c),
    marginTop: 10,
    minHeight: 56,
    paddingVertical: 8,
    borderRadius: 18,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: c.text,
  },
  colors: {
    marginTop: 12,
  },
  hint: {
    marginTop: 8,
    marginHorizontal: 4,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
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
  iconCellLarge: {
    width: '25%',
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
  iconTick: {
    position: 'absolute',
    top: 5,
    right: 5,
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
    color: c.text,
  },
  pressed: {
    opacity: 0.7,
  },
  save: {
    marginTop: 26,
  },
  restoreCard: {
    ...cardSurface(c),
    marginTop: 10,
    paddingVertical: 4,
  },
  restoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  // Large text: the leading icon on its own line, the texts on the whole width under it
  stackLarge: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
  },
  fillLarge: {
    flex: 0,
    alignSelf: 'stretch',
  },
  nameLarge: {
    flex: 0,
  },
  restoreDivider: {
    borderTopWidth: 1,
    borderTopColor: c.separator,
  },
  restoreName: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  restoreAction: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: c.accent,
  },
});
