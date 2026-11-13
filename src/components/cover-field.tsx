import { StyleSheet } from 'react-native';

import { ColorPicker } from '@/components/color-picker';
import { FormField } from '@/components/form-field';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { WhiteCard } from '@/components/white-card';
import { CARD_COLORS } from '@/constants/card-colors';
import type { CategoryColors, CoverMode } from '@/db/types';
import { type Palette } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

const MODES: CoverMode[] = ['photo', 'color'];

type Props = {
  mode: CoverMode; // what is shown now (the automatic choice already resolved)
  onModeChange: (mode: CoverMode) => void;
  color: string | null; // null = the category color
  onColorChange: (color: string | null) => void;
  // The category colors (palette-aware): the first swatch, "the category color" (null).
  // Not given for cards, whose color is a preset or their own hex.
  categoryColors?: CategoryColors;
  hasPhoto: boolean; // without a photo, "Foto" falls back to the color
  onDraggingChange?: (dragging: boolean) => void; // a finger on the color wheel: the form must not scroll
};

// "Copertina: Foto | Colore" in Nuovo documento, Modifica and the card form: how the document
// looks in the grids. Foto = its front photo, full-bleed, with the title on a dark bar.
// Colore = a background color with the title large; the category color, a preset, or "Il tuo colore"
// (wheel and hex code).
export function CoverField({ mode, onModeChange, color, onColorChange, categoryColors, hasPhoto, onDraggingChange }: Props) {
  const styles = useThemedStyles(makeStyles);

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
        <WhiteCard style={styles.colors}>
          <ColorPicker
            presets={[
              ...(categoryColors
                ? [
                    {
                      key: 'category',
                      name: 'Colore della categoria',
                      colors: [categoryColors.top, categoryColors.bottom] as const,
                      symbol: 'folder' as const,
                      symbolColor: categoryColors.text,
                    },
                  ]
                : []),
              ...CARD_COLORS.map((swatch, index) => ({
                key: swatch,
                name: `Colore ${index + 1}`,
                colors: [swatch, swatch] as const,
              })),
            ]}
            value={color ?? 'category'}
            // "Il tuo colore" gives a '#RRGGBB': saved as the cover (or card) color like the others
            onChange={(value) => onColorChange(value === 'category' ? null : value)}
            onDraggingChange={onDraggingChange}
          />
        </WhiteCard>
      )}
    </FormField>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  colors: {
    padding: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
});
