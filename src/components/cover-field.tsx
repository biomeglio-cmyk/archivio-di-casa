import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { WhiteCard } from '@/components/white-card';
import { CARD_COLORS } from '@/constants/card-colors';
import type { CategoryColors, CoverMode } from '@/db/types';

const MODES: CoverMode[] = ['photo', 'color'];

type Props = {
  mode: CoverMode; // what is shown now (the automatic choice already resolved)
  onModeChange: (mode: CoverMode) => void;
  color: string | null; // null = the category color
  onColorChange: (color: string | null) => void;
  // The category colors (palette-aware): the first swatch, "the category color" (null).
  // Not given for cards, whose color is always one of CARD_COLORS.
  categoryColors?: CategoryColors;
  hasPhoto: boolean; // without a photo, "Foto" falls back to the color
};

// "Copertina: Foto | Colore" in Nuovo documento, Modifica and the card form: how the document
// looks in the grids. Foto = its front photo, full-bleed, with the title on a dark bar.
// Colore = a background color with the title large; the category color or one picked here.
export function CoverField({ mode, onModeChange, color, onColorChange, categoryColors, hasPhoto }: Props) {

  return (
    <FormField label="Copertina">
      <Segmented
        values={['Foto', 'Colore']}
        selectedIndex={MODES.indexOf(mode)}
        onChange={(index) => onModeChange(MODES[index])}
      />
      {mode === 'photo' && !hasPhoto && (
        <ThemedText type="small" themeColor="textSecondary">
          Senza foto si vede il colore: aggiungi una pagina per avere la foto in copertina.
        </ThemedText>
      )}
      {mode === 'color' && (
        <WhiteCard style={styles.colors} accessibilityRole="radiogroup">
          {categoryColors && (
            <Pressable
              onPress={() => onColorChange(null)}
              accessibilityRole="radio"
              accessibilityState={{ selected: color === null }}
              accessibilityLabel="Colore della categoria"
              hitSlop={4}
              style={[styles.ring, color === null && { borderColor: categoryColors.text }]}>
              <LinearGradient colors={[categoryColors.top, categoryColors.bottom]} style={[styles.swatch, styles.center]}>
                <SymbolView name="folder" tintColor={categoryColors.text} size={14} />
              </LinearGradient>
            </Pressable>
          )}
          {CARD_COLORS.map((swatch, index) => {
            const selected = swatch === color;
            return (
              <Pressable
                key={swatch}
                onPress={() => onColorChange(swatch)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Colore ${index + 1}`}
                hitSlop={4}
                style={[styles.ring, selected && { borderColor: swatch }]}>
                <View style={[styles.swatch, { backgroundColor: swatch }]} />
              </Pressable>
            );
          })}
        </WhiteCard>
      )}
    </FormField>
  );
}

const styles = StyleSheet.create({
  colors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  ring: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
    padding: 3,
  },
  swatch: {
    flex: 1,
    borderRadius: 14,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
