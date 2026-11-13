import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { pickPdf } from '@/capture/pick-files';
import { useIconRow } from '@/components/icon-row';
import { CATEGORY_TILE_HEIGHT, CategoryTile } from '@/components/category-tile';
import { PrimaryButton } from '@/components/primary-button';
import { Text } from '@/components/text';
import { TileGrid } from '@/components/tile-grid';
import { GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { type Palette } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import type { CategoryWithCount } from '@/db/types';
import { encodePendingFiles } from '@/storage/pending-files';
import { whenBelowLimit } from '@/settings/free-limit';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { t, useI18n } from '@/i18n';

// "Carica un PDF": the file picker, then Nuovo documento with the PDF attached
async function loadPdf() {
  try {
    const files = await pickPdf();
    if (files) router.push({ pathname: '/new-document', params: { files: encodePendingFiles(files) } });
  } catch (error) {
    Alert.alert(t('homeEmpty.openFailed'), String(error));
  }
}

// Home with no documents yet (docs/design/HomeVuota.dc.html): on pale lilac two sheets and the camera,
// "Fotografa il tuo primo documento", "Fotografa un documento" (the "+") and "Carica un PDF";
// then LE TUE CARTELLE: every category on its light tint with "Vuota". Our extra: the dashed
// "Nuova categoria" at the end.
// The folders of Home vuota: these built-in ones only, in this order (by their key, so a renamed or
// recolored one keeps the user's name and color; a hidden one is not in the list and is skipped).
// The others still exist and show up in Home as soon as there is a document.
const EMPTY_HOME_FOLDERS = ['person.text.rectangle', 'house', 'creditcard', 'cross.case', 'key'] as const; // Documenti, Casa, Tessere e card, Spese 730, Password

export function HomeEmpty({ categories }: { categories: CategoryWithCount[] }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  // Large text: "Carica un PDF" with its icon above, centered like the empty state and its button
  const iconRow = useIconRow();
  const folders = EMPTY_HOME_FOLDERS.flatMap((key) => categories.filter((c) => c.builtinKey === key).slice(0, 1));
  return (
    <>
      <View style={styles.card}>
        <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Sheet left={14} top={14} rotate="-10deg" accent="#FFA36E" />
          <Sheet right={12} top={4} rotate="8deg" accent="#6FD3AE" />
          {/* Shadow outside, the round gradient clipped inside (rounded on iOS too) */}
          <View style={styles.camera}>
            <View style={[StyleSheet.absoluteFill, styles.cameraClip]}>
              <LinearGradient colors={theme.gradient} start={GRADIENT_START} end={GRADIENT_END} style={StyleSheet.absoluteFill} />
            </View>
            <SymbolView name="camera" tintColor="#FFFFFF" size={24} />
          </View>
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {t('homeEmpty.title')}
        </Text>
        <Text style={styles.text}>{t('homeEmpty.text')}</Text>
        <PrimaryButton label={t('homeEmpty.snap')} symbol="camera" onPress={() => whenBelowLimit(() => router.push('/add-document'))} style={styles.button} />
        <Pressable onPress={() => whenBelowLimit(loadPdf)} accessibilityRole="button" style={({ pressed }) => [styles.pdf, iconRow.rowCentered, pressed && styles.pressed]}>
          <SymbolView name="doc" tintColor={theme.accent} size={18} />
          <Text style={[styles.pdfText, iconRow.large && styles.pdfTextLarge]}>{t('homeEmpty.pdf')}</Text>
        </Pressable>
      </View>

      <Text style={styles.section} accessibilityRole="header">
        {t('homeEmpty.folders')}
      </Text>
      {/* The tiles of Home (same component, size and colors), so nothing moves when the first
          document arrives; "Vuota" in place of the count */}
      <TileGrid
        items={folders}
        keyFor={(category) => category.id}
        renderTile={(category, size) => (
          <Pressable
            onPress={() => router.push({ pathname: '/category/[id]', params: { id: String(category.id) } })}
            accessibilityRole="button"
            accessibilityLabel={t('homeEmpty.emptyAccessibility', { name: category.name })}
            style={({ pressed }) => [{ ...size, minHeight: CATEGORY_TILE_HEIGHT }, pressed && styles.pressed]}>
            <CategoryTile category={category} documentCount={0} emptyLabel={t('homeEmpty.empty')} />
          </Pressable>
        )}
        add={{ label: t('homeEmpty.newCategory'), onPress: () => router.push('/category-form') }}
      />
    </>
  );
}

function Sheet({ left, right, top, rotate, accent }: { left?: number; right?: number; top: number; rotate: string; accent: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.sheet, { left, right, top, transform: [{ rotate }] }]}>
      <View style={[styles.line, { width: 30, height: 7, backgroundColor: accent }]} />
      <View style={[styles.line, { width: 46 }]} />
      <View style={[styles.line, { width: 38 }]} />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  card: {
    marginTop: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 26,
    borderCurve: 'continuous',
    backgroundColor: c.paleLilac,
    alignItems: 'center',
  },
  art: {
    width: 150,
    height: 112,
  },
  sheet: {
    position: 'absolute',
    width: 74,
    height: 92,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 8px 18px rgba(28, 30, 70, 0.10)',
    gap: 6,
  },
  line: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E6E8F0',
  },
  camera: {
    position: 'absolute',
    left: 75 - 26,
    bottom: 0,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 16px rgba(100, 90, 235, 0.30)',
  },
  cameraClip: {
    borderRadius: 26,
    overflow: 'hidden',
  },
  title: {
    marginTop: 18,
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: c.text,
    textAlign: 'center',
  },
  text: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: FONTS.regular,
    color: c.textOnLilac,
    textAlign: 'center',
  },
  button: {
    marginTop: 18,
    alignSelf: 'stretch',
  },
  pdf: {
    marginTop: 8,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pdfText: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: c.accent,
  },
  pdfTextLarge: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  section: {
    marginTop: 26,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: c.textSecondary,
  },
});
