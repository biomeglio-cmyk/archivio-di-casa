import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { StyleSheet } from 'react-native';

import { GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { previewGradient, previewSymbol } from '@/constants/password-options';
import type { PasswordInfo } from '@/db/types';
import { resolveDocumentFile } from '@/storage/document-files';
import { hexToRgb } from '@/utils/colors';
import { type Palette } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

type Props = {
  info: Pick<PasswordInfo, 'type' | 'preview'>;
  size: number; // 64 in the form, 44 in the rows, larger in the detail
  imageUri?: string | null; // an image just chosen in the form (wins over the saved one)
  shadow?: boolean;
};

// "Anteprima" of a Password entry (docs/design/NuovaPassword.dc.html): its image, or its color with
// the icon in white. The same square is its tile and its row in the lists.
export function PasswordPreviewTile({ info, size, imageUri, shadow = true }: Props) {
  const styles = useThemedStyles(makeStyles);
  const radius = Math.round(size * 0.28);
  const [top, bottom] = previewGradient(info.preview);
  const uri = imageUri ?? (info.preview.imagePath ? resolveDocumentFile(info.preview.imagePath).uri : null);
  const glow = shadow ? { boxShadow: `0 6px 14px rgba(${hexToRgb(bottom)}, 0.28)` } : null;
  const box = { width: size, height: size, borderRadius: radius };

  if (uri) {
    return <Image source={{ uri }} style={[styles.square, box, glow]} contentFit="cover" accessibilityIgnoresInvertColors />;
  }
  return (
    <LinearGradient colors={[top, bottom]} start={GRADIENT_START} end={GRADIENT_END} style={[styles.square, box, glow]}>
      <SymbolView name={previewSymbol(info.preview, info.type)} tintColor="#FFFFFF" size={Math.round(size * 0.44)} />
    </LinearGradient>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  square: {
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
});
