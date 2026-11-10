import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { confirmDeleteDocument } from '@/actions/delete-actions';
import { CardFace } from '@/components/card-face';
import { DetailActionBar } from '@/components/detail-action-bar';
import { PersonAvatar } from '@/components/person-avatar';
import { PinHeart } from '@/components/pin-heart';
import { ThemedText } from '@/components/themed-text';
import type { DocumentDetail, DocumentFile } from '@/db/types';
import { useMaxBrightness } from '@/hooks/use-max-brightness';
import { useTheme } from '@/hooks/use-theme';
import { resolveDocumentFile } from '@/storage/document-files';

// White behind the barcode in light and dark mode: scanners need dark bars on white
const BARCODE_BACKGROUND = '#FFFFFF';
const BARCODE_TEXT = '#000000';

type Props = {
  card: DocumentDetail;
  files: DocumentFile[];
  pin: { pinned: boolean; onToggle: () => void }; // heart and "Aggiungi ai preferiti"
};

// Detail of a card ("Tessere e card"): the card on top, then the barcode photo on white,
// ready to be shown at the checkout with the screen at full brightness
export function CardDetail({ card, files, pin }: Props) {
  const theme = useTheme();
  const db = useSQLiteContext();
  const { width } = useWindowDimensions();
  const [fullScreen, setFullScreen] = useState(false);
  useMaxBrightness();

  const barcode = files.find((f) => f.kind === 'image' && f.side === 'barcode');
  const barcodeUri = barcode ? resolveDocumentFile(barcode.path).uri : null;

  return (
    <>
      <Stack.Screen options={{ title: card.title }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.cardShadow}>
          <CardFace card={card} width={width - 32} large />
        </View>

        <View style={styles.barcodeCard}>
          {barcodeUri ? (
            <Pressable
              onPress={() => setFullScreen(true)}
              accessibilityRole="button"
              accessibilityLabel="Codice a barre"
              accessibilityHint="Apre il codice a tutto schermo, in orizzontale">
              <Image source={{ uri: barcodeUri }} style={styles.barcode} contentFit="contain" accessibilityIgnoresInvertColors />
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
          {barcodeUri && <Text style={styles.tapHint}>Tocca il codice per ingrandirlo</Text>}
        </View>

        {card.person && (
          <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
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
      {barcodeUri && (
        <BarcodeFullScreen uri={barcodeUri} value={card.barcodeValue} visible={fullScreen} onClose={() => setFullScreen(false)} />
      )}
    </>
  );
}

// The barcode photo turned sideways over the whole screen (landscape without rotating the
// app: the phone is simply turned). Tap anywhere to close.
function BarcodeFullScreen({ uri, value, visible, onClose }: { uri: string; value: string | null; visible: boolean; onClose: () => void }) {
  const { width, height } = useWindowDimensions();

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <StatusBar hidden />
      <Pressable style={styles.fullScreen} onPress={onClose} accessibilityRole="button" accessibilityLabel="Chiudi il codice">
        {/* A box as long as the screen is tall, rotated 90°: the barcode fills the long side */}
        <View style={[styles.rotated, { width: height, height: width, transform: [{ rotate: '90deg' }] }]}>
          <Image source={{ uri }} style={styles.fullImage} contentFit="contain" />
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
    padding: 16,
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
