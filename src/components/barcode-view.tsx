import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { Text } from '@/components/text';
import type { GeneratedBarcode } from '@/utils/barcode';
import { type Palette } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

// White behind the barcode: scanners need dark bars on white
const BARCODE_BACKGROUND = '#FFFFFF';
const BARCODE_TEXT = '#000000';

const QUIET_ZONE = 8; // white margin around the code, so it reads on a dark card too

// The generated code, as large as fits the box, never stretched, on white (also in the dark theme)
export function GeneratedCode({ barcode, maxWidth, maxHeight }: { barcode: GeneratedBarcode; maxWidth: number; maxHeight: number }) {
  const styles = useThemedStyles(makeStyles);
  const width = Math.min(maxWidth - QUIET_ZONE * 2, (maxHeight - QUIET_ZONE * 2) * barcode.aspect);
  return (
    <View style={styles.codeBox} accessibilityIgnoresInvertColors accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={barcode.xml} width={width} height={width / barcode.aspect} />
    </View>
  );
}

type FullScreenProps = {
  barcode: GeneratedBarcode | null; // the generated code, or null to show the photo
  uri: string | null;
  value: string | null;
  visible: boolean;
  onClose: () => void;
};

// The code over the whole screen, on white. A 1D code (and the photo) is turned sideways, so it
// uses the long side (landscape without rotating the app: the phone is simply turned);
// a QR / PDF417 / DataMatrix stays upright. Tap anywhere to close.
export function BarcodeFullScreen({ barcode, uri, value, visible, onClose }: FullScreenProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const sideways = !barcode?.twoD;
  // The box: as long as the screen is tall when sideways
  const box = sideways ? { width: height, height: width } : { width, height };

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <StatusBar hidden />
      <Pressable
        style={styles.fullScreen}
        onPress={onClose}
        onAccessibilityEscape={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('barcodeView.close')}
        accessibilityValue={value ? { text: value.split('').join(' ') } : undefined}>
        <View style={[styles.rotated, box, sideways && { transform: [{ rotate: '90deg' }] }]}>
          {barcode ? (
            <GeneratedCode barcode={barcode} maxWidth={box.width - 48} maxHeight={box.height - 120} />
          ) : (
            uri && <Image source={{ uri }} style={styles.fullImage} contentFit="contain" />
          )}
          {value && (
            <Text style={styles.fullNumber} maxFontSizeMultiplier={1.5}>
              {value}
            </Text>
          )}
        </View>
        <View style={styles.close}>
          <SymbolView name="xmark.circle.fill" tintColor="#6E6E73" size={32} />
        </View>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  codeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BARCODE_BACKGROUND,
    padding: QUIET_ZONE,
    borderRadius: 8,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: BARCODE_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotated: {
    padding: 24,
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    flex: 1,
    alignSelf: 'stretch',
  },
  fullNumber: {
    color: BARCODE_TEXT,
    fontSize: 26,
    letterSpacing: 3,
    fontVariant: ['tabular-nums'],
    fontWeight: 600,
  },
  close: {
    position: 'absolute',
    top: 56,
    right: 20,
  },
});
