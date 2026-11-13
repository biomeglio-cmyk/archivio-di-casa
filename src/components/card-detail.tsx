import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useIconRow } from '@/components/icon-row';
import { Segmented } from '@/components/segmented';
import { Text } from '@/components/text';
import { confirmDeleteDocument } from '@/actions/delete-actions';
import { CardFace } from '@/components/card-face';
import { DeadlineSection } from '@/components/deadline-section';
import { DetailActionBar } from '@/components/detail-action-bar';
import { PersonAvatar } from '@/components/person-avatar';
import { PinHeart } from '@/components/pin-heart';
import { ThemedText } from '@/components/themed-text';
import { WhiteCard } from '@/components/white-card';
import { type Palette, Spacing } from '@/constants/theme';
import type { DocumentDetail, DocumentFile } from '@/db/types';
import { useMaxBrightness } from '@/hooks/use-max-brightness';
import { resolveDocumentFile } from '@/storage/document-files';
import { BarcodeFullScreen, GeneratedCode } from '@/components/barcode-view';
import { generateBarcode } from '@/utils/barcode';
import { useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

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
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  // Larger text: "Persona" above, then the avatar above the name, all on the left
  const iconRow = useIconRow();
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
        {/* The card is a picture (often a photo): VoiceOver says what is on it */}
        <View
          style={styles.cardShadow}
          accessible
          accessibilityRole="image"
          accessibilityLabel={[card.title, card.docType, card.person?.name].filter(Boolean).join(', ')}>
          <CardFace card={card} width={width - 32} large />
        </View>

        <View style={styles.barcodeCard}>
          {/* Both available: choose between the generated code and the photo */}
          {generated && barcodeUri && (
            <Segmented
              accessibilityLabel={t('a11y.segmented.show')}
              values={[t('cardDetail.code'), t('cardDetail.photo')]}
              selectedIndex={view === 'code' ? 0 : 1}
              onChange={(index) => setView(index === 0 ? 'code' : 'photo')}
            />
          )}

          {showCode || barcodeUri ? (
            <Pressable
              onPress={() => setFullScreen(true)}
              accessibilityRole="button"
              accessibilityLabel={showCode ? t('cardDetail.barcodeLabel') : t('cardDetail.barcodePhotoLabel')}
              accessibilityHint={t('cardDetail.fullScreenHint')}>
              {showCode ? (
                <GeneratedCode barcode={generated!} maxWidth={codeWidth} maxHeight={CODE_MAX_HEIGHT} />
              ) : (
                <Image source={{ uri: barcodeUri! }} style={styles.barcode} contentFit="contain" accessibilityIgnoresInvertColors />
              )}
            </Pressable>
          ) : (
            !card.barcodeValue && (
              <Text style={styles.empty}>{t('cardDetail.noCode')}</Text>
            )
          )}
          {card.barcodeValue && (
            <Text
              style={styles.number}
              selectable
              accessibilityLabel={t('a11y.walletCard.number', { number: card.barcodeValue.split('').join(' ') })}>
              {card.barcodeValue}
            </Text>
          )}
          {/* Said by VoiceOver as the hint of the code */}
          {(showCode || barcodeUri) && (
            <Text style={styles.tapHint} accessibilityElementsHidden importantForAccessibility="no">
              {t('cardDetail.tapHint')}
            </Text>
          )}
        </View>

        {card.person && (
          <WhiteCard
            style={[styles.infoCard, iconRow.large && styles.infoCardStacked]}
            accessible
            accessibilityLabel={`${t('cardDetail.person')}, ${card.person.name}`}>
            <ThemedText themeColor="textSecondary">{t('cardDetail.person')}</ThemedText>
            <View style={[styles.person, iconRow.row]}>
              <PersonAvatar name={card.person.name} photoPath={card.person.photoPath} size={28} />
              <ThemedText style={[styles.personName, iconRow.text]}>{card.person.name}</ThemedText>
            </View>
          </WhiteCard>
        )}

        {/* Cards too can have a deadline (e.g. a membership to renew), added from here */}
        <DeadlineSection document={card} />

        <View style={styles.actions}>
          <DetailActionBar
            pin={pin}
            onAdd={null}
            onEdit={() => router.push({ pathname: '/edit-card/[id]', params: { id: String(card.id) } })}
            onDelete={() => confirmDeleteDocument(card)}
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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
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
  infoCardStacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
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
});
