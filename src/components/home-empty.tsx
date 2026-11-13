import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { pickPdf } from '@/capture/pick-files';
import { PrimaryButton } from '@/components/primary-button';
import { Text } from '@/components/text';
import { BRAND_GRADIENT, GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { Colors, Spacing, themedStyles } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import type { CategoryWithCount } from '@/db/types';
import { encodePendingFiles } from '@/storage/pending-files';
import { categoryTint } from '@/utils/colors';
import { whenBelowLimit } from '@/settings/free-limit';

// "Carica un PDF": the file picker, then Nuovo documento with the PDF attached
async function loadPdf() {
  try {
    const files = await pickPdf();
    if (files) router.push({ pathname: '/new-document', params: { files: encodePendingFiles(files) } });
  } catch (error) {
    Alert.alert('Impossibile aprire il file', String(error));
  }
}

// Home with no documents yet (docs/design/HomeVuota.dc.html): on pale lilac two sheets and the camera,
// "Fotografa il tuo primo documento", "Fotografa un documento" (the "+") and "Carica un PDF";
// then LE TUE CARTELLE: every category on its light tint with "Vuota". Our extra: the dashed
// "Nuova categoria" at the end.
export function HomeEmpty({ categories }: { categories: CategoryWithCount[] }) {
  const { width } = useWindowDimensions();
  const tileWidth = (width - Spacing.side * 2 - 12) / 2;
  return (
    <>
      <View style={styles.card}>
        <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Sheet left={14} top={14} rotate="-10deg" accent="#FFA36E" />
          <Sheet right={12} top={4} rotate="8deg" accent="#6FD3AE" />
          {/* Shadow outside, the round gradient clipped inside (rounded on iOS too) */}
          <View style={styles.camera}>
            <View style={[StyleSheet.absoluteFill, styles.cameraClip]}>
              <LinearGradient colors={BRAND_GRADIENT} start={GRADIENT_START} end={GRADIENT_END} style={StyleSheet.absoluteFill} />
            </View>
            <SymbolView name="camera" tintColor="#FFFFFF" size={24} />
          </View>
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Fotografa il tuo primo documento
        </Text>
        <Text style={styles.text}>
          Una bolletta, la carta d’identità o la garanzia della lavatrice: in pochi secondi è al sicuro e sempre sottomano.
        </Text>
        <PrimaryButton label="Fotografa un documento" symbol="camera" onPress={() => whenBelowLimit(() => router.push('/add-document'))} style={styles.button} />
        <Pressable onPress={() => whenBelowLimit(loadPdf)} accessibilityRole="button" style={({ pressed }) => [styles.pdf, pressed && styles.pressed]}>
          <SymbolView name="doc" tintColor={Colors.current.accent} size={18} />
          <Text style={styles.pdfText}>Carica un PDF</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>Le tue cartelle</Text>
      <View style={styles.grid}>
        {categories.map((category) => {
          const { tint, onTint } = categoryTint(category.colors);
          return (
            <Pressable
              key={category.id}
              onPress={() => router.push({ pathname: '/category/[id]', params: { id: String(category.id) } })}
              accessibilityRole="button"
              accessibilityLabel={`${category.name}, vuota`}
              style={({ pressed }) => [styles.folder, { width: tileWidth, backgroundColor: tint }, pressed && styles.pressed]}>
              <SymbolView name={category.symbol} tintColor={onTint} size={22} />
              <View>
                <Text style={[styles.folderName, { color: onTint }]} numberOfLines={1}>
                  {category.name}
                </Text>
                <Text style={[styles.folderCount, { color: onTint }]}>Vuota</Text>
              </View>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => router.push('/category-form')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.folder, styles.add, { width: tileWidth }, pressed && { backgroundColor: Colors.current.paleLilac }]}>
          <SymbolView name="plus" tintColor={Colors.current.textSecondary} size={22} />
          <Text style={styles.addText}>Nuova categoria</Text>
        </Pressable>
      </View>
    </>
  );
}

function Sheet({ left, right, top, rotate, accent }: { left?: number; right?: number; top: number; rotate: string; accent: string }) {
  return (
    <View style={[styles.sheet, { left, right, top, transform: [{ rotate }] }]}>
      <View style={[styles.line, { width: 30, height: 7, backgroundColor: accent }]} />
      <View style={[styles.line, { width: 46 }]} />
      <View style={[styles.line, { width: 38 }]} />
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  card: {
    marginTop: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 26,
    borderCurve: 'continuous',
    backgroundColor: Colors.current.paleLilac,
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
    color: Colors.current.text,
    textAlign: 'center',
  },
  text: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: FONTS.regular,
    color: Colors.current.textOnLilac,
    textAlign: 'center',
  },
  button: {
    marginTop: 18,
    alignSelf: 'stretch',
  },
  pdf: {
    marginTop: 8,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pdfText: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: Colors.current.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  section: {
    marginTop: 26,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: Colors.current.textSecondary,
  },
  grid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  folder: {
    height: 96,
    padding: 14,
    borderRadius: 20,
    borderCurve: 'continuous',
    justifyContent: 'space-between',
  },
  folderName: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
  },
  folderCount: {
    fontSize: 12,
    fontFamily: FONTS.medium,
  },
  add: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.current.dashed,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addText: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: Colors.current.textSecondary,
  },
}));
