import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { Text } from '@/components/text';
import { confirmDeleteDocument } from '@/actions/delete-actions';
import { CardFace } from '@/components/card-face';
import { DetailActionBar } from '@/components/detail-action-bar';
import { PersonAvatar } from '@/components/person-avatar';
import { PinHeart } from '@/components/pin-heart';
import { ThemedText } from '@/components/themed-text';
import { CardSurface, Spacing } from '@/constants/theme';
import type { DocumentDetail, DocumentFile } from '@/db/types';
import { useMaxBrightness } from '@/hooks/use-max-brightness';
import { resolveDocumentFile } from '@/storage/document-files';
import { generateBarcode, type GeneratedBarcode } from '@/utils/barcode';

// White behind the barcode in light and dark mode: scanners need dark bars on white
const BARCODE_BACKGROUND = '#FFFFFF';
const BARCODE_TEXT = '#000000';
const CODE_MAX_HEIGHT = 200; // a 1D code is wide and low; a 2D code is at most this tall

type Props = {
  card: DocumentDetail;
  files: DocumentFile[];
  pin: { pinned: boolean; onToggle: () => void }; // heart and "Aggiungi ai preferiti"
};

// Detail of a card ("Tessere e card"): the card on top, then the barcode photo on white,
// ready to be shown at the checkout with the screen at full brightness
export function CardDetail({ card, files, pin }: Props) {
  const db = useSQLiteContext();
  const { width } = useWindowDimensions();
  const [fullScreen, setFullScreen] = useState(false);
  useMaxBrightness();

  const barcode = files.find((f) => f.kind === 'image' && f.side === 'barcode');
  const barcodeUri = barcode ? resolveDocumentFile(barcode.path).uri : null;
  // The code drawn from the value read by the camera; null = unknown format or typed by hand
  const generated = useMemo(() => generateBarcode(card.barcodeValue, card.barcodeType), [card.barcodeValue, card.barcodeType]);
  const [view, setView] = useState<'code' | 'photo'>('code'); // "Codice" / "Foto"
  const showCode = generated !== null && (view === 'code' || !barcodeUri);
  const codeWidth = width - 64; // screen - page padding - white box padding

  return (
    <>
      <Stack.Screen options={{ title: card.title }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.cardShadow}>
          <CardFace card={card} width={width - 32} large />
        </View>

        <View style={styles.barcodeCard}>
          {/* Both available: choose between the generated code and the photo */}
          {generated && barcodeUri && (
            <SegmentedControl
              values={['Codice', 'Foto']}
              selectedIndex={view === 'code' ? 0 : 1}
              onChange={(event) => setView(event.nativeEvent.selectedSegmentIndex === 0 ? 'code' : 'photo')}
            />
          )}

          {showCode || barcodeUri ? (
            <Pressable
              onPress={() => setFullScreen(true)}
              accessibilityRole="button"
              accessibilityLabel={showCode ? 'Codice a barre' : 'Foto del codice a barre'}
              accessibilityHint="Apre il codice a tutto schermo">
              {showCode ? (
                <GeneratedCode barcode={generated!} maxWidth={codeWidth} maxHeight={CODE_MAX_HEIGHT} />
              ) : (
                <Image source={{ uri: barcodeUri! }} style={styles.barcode} contentFit="contain" accessibilityIgnoresInvertColors />
              )}
            </Pressable>
          ) : (
            !card.barcodeValue && (
              <Text style={styles.empty}>Nessun codice. Tocca «Modifica» per fotografarlo o scriverlo.</Text>
            )
          )}
          {card.barcodeValue && (
            <Text style={styles.number} selectable>
              {card.barcodeValue}
            </Text>
          )}
          {(showCode || barcodeUri) && <Text style={styles.tapHint}>Tocca il codice per ingrandirlo</Text>}
        </View>

        {card.person && (
          <View style={[styles.infoCard, CardSurface]}>
            <ThemedText themeColor="textSecondary">Persona</ThemedText>
            <View style={styles.person}>
              <PersonAvatar name={card.person.name} photoPath={card.person.photoPath} size={28} />
              <ThemedText style={styles.personName}>{card.person.name}</ThemedText>
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <DetailActionBar
            pin={pin}
            onAdd={null}
            onEdit={() => router.push({ pathname: '/edit-card/[id]', params: { id: String(card.id) } })}
            onDelete={() => confirmDeleteDocument(db, card)}
          />
        </View>
      </ScrollView>

      <PinHeart {...pin} />
      {(showCode || barcodeUri) && (
        <BarcodeFullScreen
          barcode={showCode ? generated : null}
          uri={barcodeUri}
          value={card.barcodeValue}
          visible={fullScreen}
          onClose={() => setFullScreen(false)}
        />
      )}
    </>
  );
}

// The generated code, as large as fits the box, never stretched
function GeneratedCode({ barcode, maxWidth, maxHeight }: { barcode: GeneratedBarcode; maxWidth: number; maxHeight: number }) {
  const width = Math.min(maxWidth, maxHeight * barcode.aspect);
  return (
    <View style={styles.codeBox} accessibilityIgnoresInvertColors>
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
function BarcodeFullScreen({ barcode, uri, value, visible, onClose }: FullScreenProps) {
  const { width, height } = useWindowDimensions();
  const sideways = !barcode?.twoD;
  // The box: as long as the screen is tall when sideways
  const box = sideways ? { width: height, height: width } : { width, height };

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <StatusBar hidden />
      <Pressable style={styles.fullScreen} onPress={onClose} accessibilityRole="button" accessibilityLabel="Chiudi il codice">
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
          <SymbolView name="xmark.circle.fill" tintColor="#8E8E93" size={32} />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 16,

    paddingHorizontal: Spacing.side,
    paddingBottom: 48,
    gap: 16,
  },
  cardShadow: {
    borderRadius: 12,
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.18)',
  },
  barcodeCard: {
    backgroundColor: BARCODE_BACKGROUND,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 16,
    gap: 10,
    alignItems: 'stretch',
  },
  barcode: {
    width: '100%',
    height: 200,
  },
  codeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BARCODE_BACKGROUND,
  },
  number: {
    color: BARCODE_TEXT,
    fontSize: 22,
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
    textAlign: 'center',
    fontWeight: 600,
  },
  tapHint: {
    color: '#6E6E73',
    fontSize: 13,
    textAlign: 'center',
  },
  empty: {
    color: '#6E6E73',
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 12,
  },
  infoCard: {
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  personName: {
    flexShrink: 1,
  },
  actions: {
    gap: 8,
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
