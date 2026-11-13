import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { modalAnimation, useReduceMotion } from '@/a11y/accessibility';
import { pickImageUri } from '@/capture/pick-files';
import { CARD_QUALITY, scanDocument } from '@/capture/scan-document';
import { GeneratedCode } from '@/components/barcode-view';
import { CardCapture, type CardCaptureResult, type CardStep } from '@/components/card-capture';
import { CoverField } from '@/components/cover-field';
import { Choice } from '@/components/grouped-list';
import { PrimaryButton } from '@/components/primary-button';
import { Segmented } from '@/components/segmented';
import { Text, TextInput } from '@/components/text';
import { spacedNumber, WalletCardFace } from '@/components/wallet-card';
import { WhiteCard } from '@/components/white-card';
import { BRAND_GRADIENT, GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { onSoftTint, type Palette, softTint, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { listPeople } from '@/db/people';
import type { CoverMode } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useI18n } from '@/i18n';
import { barcodeTypeName, codeKindOf, generateBarcode, typeForKind, type CodeKind } from '@/utils/barcode';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const NONE = 0; // no person (ids start at 1)
const DARK = '#12142A';
const MINT_TINT = (p: Palette) => softTint(p, '#E6F7F0', '#15332A');
const MINT_TEXT = (p: Palette) => onSoftTint(p, '#1F7A5A', '#7FE0BC');

export type CardFormValues = {
  title: string;
  docType: string | null; // "Tipo": Carta fedeltà, Abbonamento…
  personId: number | null; // "Intestata a"
  barcodeValue: string | null;
  barcodeType: string | null; // the format read by the camera, or chosen with Codice a barre / QR code
  cardColor: string; // its "Colore" cover
  coverMode: CoverMode | null; // "Copertina"; null = automatic (Foto when there is a photo)
  frontUri: string | null; // photo of the front (file:// URI)
  barcodeUri: string | null; // photo of the barcode
};

type Props = {
  heading: string; // "Nuova tessera", "Modifica tessera"
  initial: CardFormValues;
  onSubmit: (values: CardFormValues, changed: { front: boolean; barcode: boolean }) => Promise<void>;
  onCancel: () => void;
};

// "Nuova tessera" / "Modifica tessera" (docs/design/NuovaTessera.dc.html): on a dark top the photo of
// the whole card in its frame, "Tessera riconosciuta", ✕ and "Scatta di nuovo"; then "Copertina"
// (the card as it looks in Tessere), "Codice da mostrare alla cassa" (what the camera found,
// Codice a barre / QR code, the code redrawn and its number), "Dati letti dalla tessera" and the
// fields Nome, Tipo, Numero, Intestata a; "Salva tessera". Our extras: Foto / Colore with the card
// colors, and the photo of the code (shown at the checkout when its format is unknown).
// Expo Go cannot read text from a photo: the camera reads the code (its number goes in Numero);
// Nome and Tipo are typed.
export function CardForm({ heading, initial, onSubmit, onCancel }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const largeText = useWindowDimensions().fontScale > 1.3; // fields under their labels (FieldRow)
  const { data: people } = useDbQuery(listPeople, []);

  const [title, setTitle] = useState(initial.title);
  const [docType, setDocType] = useState(initial.docType ?? '');
  const [personId, setPersonId] = useState(initial.personId ?? NONE);
  const [number, setNumber] = useState(initial.barcodeValue ?? '');
  const [scanned, setScanned] = useState({ value: initial.barcodeValue, type: initial.barcodeType });
  const [kind, setKind] = useState<CodeKind>(codeKindOf(initial.barcodeType));
  const [cardColor, setCardColor] = useState(initial.cardColor);
  const [coverMode, setCoverMode] = useState<CoverMode | null>(initial.coverMode);
  const [frontUri, setFrontUri] = useState(initial.frontUri);
  const [barcodeUri, setBarcodeUri] = useState(initial.barcodeUri);
  const [changed, setChanged] = useState({ front: false, barcode: false });
  const [retake, setRetake] = useState<CardStep | null>(null); // full-screen camera for one photo
  const [saving, setSaving] = useState(false);
  const [wheelDragging, setWheelDragging] = useState(false); // a finger on the color wheel: no scroll

  const code = number.trim();
  // The camera's format while the number and the kind are the ones it read; else drawn from the kind
  const readByCamera = code !== '' && code === scanned.value && codeKindOf(scanned.type) === kind;
  const barcodeType = readByCamera ? scanned.type : typeForKind(code, kind);
  const preview = generateBarcode(code || null, barcodeType);
  const typeName = barcodeTypeName(barcodeType);
  const found = readByCamera
    ? (kind === 'qr' ? t('cardForm.found', { name: typeName ?? '' }) : t('cardForm.foundBarcode', { name: typeName ?? '' })).trim()
    : code
      ? t('cardForm.handwritten')
      : t('cardForm.noCode');
  const holder = people?.find((p) => p.id === personId)?.name ?? null;
  const showPhoto = (coverMode ?? (frontUri ? 'photo' : 'color')) === 'photo' && frontUri !== null;
  const face = {
    title: title.trim(),
    docType: docType.trim() || null,
    barcodeValue: code || null,
    cardColor,
    coverMode: showPhoto ? ('photo' as const) : ('color' as const),
    firstImagePath: null,
    holder,
  };
  const canSave = title.trim().length > 0 && !saving;
  // The cover as VoiceOver says it: "Esselunga, Carta fedeltà, numero 0400 2219, Mario Rossi"
  const coverLabel = [
    face.title || t('walletCard.untitled'),
    face.docType,
    code ? t('a11y.walletCard.number', { number: spacedNumber(code) }) : null,
    holder,
  ]
    .filter(Boolean)
    .join(', ');

  function onRetaken(result: CardCaptureResult) {
    setRetake(null);
    if (retake === 'front' && result.frontUri) {
      setFrontUri(result.frontUri);
      setChanged((c) => ({ ...c, front: true }));
    }
    if (retake === 'barcode' && result.barcodeUri) {
      setBarcodeUri(result.barcodeUri);
      setChanged((c) => ({ ...c, barcode: true }));
      if (result.code) {
        setNumber(result.code.value);
        setScanned({ value: result.code.value, type: result.code.type });
        setKind(codeKindOf(result.code.type));
      }
    }
  }

  // "Scatta di nuovo": the iOS scanner (straight, clean crop); without it, the app camera.
  // "Annulla" in the scanner leaves the form as it was.
  async function retakeFront() {
    const result = await scanDocument({ tip: 'card', quality: CARD_QUALITY });
    if (result === 'cancelled') return;
    if (result === 'unavailable') {
      setRetake('front');
      return;
    }
    setFrontUri(result.pages[0]);
    setChanged((c) => ({ ...c, front: true }));
  }

  // "Dalle foto": the front picked from the library, as it is
  async function frontFromLibrary() {
    try {
      const uri = await pickImageUri();
      if (!uri) return;
      setFrontUri(uri);
      setChanged((c) => ({ ...c, front: true }));
    } catch (error) {
      Alert.alert(t('cardForm.photoOpenFailed'), String(error));
    }
  }

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSubmit(
        {
          title,
          docType: docType.trim() || null,
          personId: personId === NONE ? null : personId,
          barcodeValue: code || null,
          barcodeType: code ? barcodeType : null,
          cardColor,
          coverMode,
          frontUri,
          barcodeUri,
        },
        changed,
      );
    } catch (error) {
      setSaving(false);
      Alert.alert(t('cardForm.saveFailed'), error instanceof Error ? error.message : String(error));
    }
  }

  // The photo of the card, or its color face, as it will be the cover
  const coverImage = (width: number, height: number) => (
    <View style={[styles.faceClip, { width, height, borderRadius: Math.round(width * 0.05) }]}>
      {showPhoto && frontUri ? (
        <LocalPhoto uri={frontUri} />
      ) : (
        <WalletCardFace card={face} height={height} scale={width / 330} usePhoto={false} />
      )}
    </View>
  );

  return (
    <>
      <ScrollView
        scrollEnabled={!wheelDragging}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="never"
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: insets.bottom + 36 }}>
        {/* Dark top: the photographed card in its frame */}
        <View style={[styles.dark, { paddingTop: insets.top + 12 }]}>
          <View style={styles.darkBar}>
            <DarkButton symbol="xmark" label={t('common.close')} onPress={onCancel} />
            <Text style={styles.darkTitle} accessibilityRole="header">
              {heading}
            </Text>
            <DarkButton symbol="camera.rotate" label={t('cardForm.retakeFront')} onPress={retakeFront} />
          </View>
          <View style={styles.frameArea}>
            <LinearGradient colors={['#33365A', '#1C1E38']} style={[StyleSheet.absoluteFill, styles.frameGlow]} />
            {/* The same card as in Copertina below, where VoiceOver reads it */}
            <View style={styles.tilted} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {coverImage(232, 146)}
            </View>
            <View style={styles.frame} pointerEvents="none" />
            {/* On the box: take the front again (iOS scanner; cancelling keeps this one) */}
            {frontUri && <RetakePill label={t('cardForm.retakePhoto')} onPress={retakeFront} />}
          </View>
          <View style={styles.recognized} accessible>
            <SymbolView name={frontUri ? 'checkmark.circle.fill' : 'camera'} tintColor="#FFFFFF" size={16} />
            <Text style={styles.recognizedText}>{frontUri ? t('cardForm.recognized') : t('cardForm.tapRetake')}</Text>
          </View>
          {/* Ours: the front from the photo library (e.g. a macro shot made with the Camera app) */}
          <Pressable onPress={frontFromLibrary} accessibilityRole="button" hitSlop={8} style={styles.fromPhotos}>
            <SymbolView name="photo.on.rectangle" tintColor="#FFFFFF" size={15} />
            <Text style={styles.fromPhotosText}>{t('cardForm.fromPhotos')}</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={styles.section} accessibilityRole="header">
            {t('cardForm.cover')}
          </Text>
          <View style={styles.coverRow} accessible accessibilityRole="image" accessibilityLabel={coverLabel}>
            <View style={styles.coverShadow}>{coverImage(300, 188)}</View>
          </View>
          <Text style={styles.caption}>
            {showPhoto ? t('cardForm.coverPhotoCaption') : t('cardForm.coverColorCaption')}
          </Text>
          <View style={styles.coverField}>
            <CoverField
              mode={coverMode ?? (frontUri ? 'photo' : 'color')}
              onModeChange={setCoverMode}
              color={cardColor}
              onColorChange={(color) => color && setCardColor(color)}
              hasPhoto={Boolean(frontUri)}
              onDraggingChange={setWheelDragging}
            />
          </View>

          <Text style={styles.section} accessibilityRole="header">
            {t('cardForm.codeSection')}
          </Text>
          <WhiteCard style={styles.codeCard}>
            <View style={styles.foundRow}>
              <View style={styles.found} accessible>
                <SymbolView name={readByCamera ? 'checkmark' : code ? 'keyboard' : 'questionmark'} tintColor={MINT_TEXT(theme)} size={12} weight="bold" />
                <Text style={styles.foundText}>{found}</Text>
              </View>
              <Pressable onPress={() => setRetake('barcode')} accessibilityRole="button" hitSlop={10}>
                <Text style={styles.link}>{barcodeUri ? t('cardForm.retakePhoto') : t('cardForm.photographCode')}</Text>
              </Pressable>
            </View>
            {/* The photo of the code, on dark like the card above, with "Rifai la foto" on it */}
            {barcodeUri && (
              <View style={styles.barcodeBox}>
                <Image
                  source={{ uri: barcodeUri }}
                  style={StyleSheet.absoluteFill}
                  contentFit="contain"
                  accessibilityIgnoresInvertColors
                  accessible
                  accessibilityRole="image"
                  accessibilityLabel={t('cardDetail.barcodePhotoLabel')}
                />
                <RetakePill label={t('cardForm.retakePhoto')} onPress={() => setRetake('barcode')} />
              </View>
            )}
            <View style={styles.kind}>
              <Segmented
                values={[t('cardForm.barcode'), t('cardForm.qrCode')]}
                selectedIndex={kind === 'bar' ? 0 : 1}
                onChange={(index) => setKind(index === 0 ? 'bar' : 'qr')}
              />
            </View>
            <View style={styles.previewBox} accessible>
              {preview ? (
                <GeneratedCode barcode={preview} maxWidth={260} maxHeight={kind === 'qr' ? 120 : 86} />
              ) : (
                <SymbolView name={kind === 'qr' ? 'qrcode' : 'barcode'} tintColor={theme.dashed} size={56} />
              )}
              <Text style={styles.previewNumber}>
                {code
                  ? kind === 'qr'
                    ? t('cardForm.qrCaption', { name: title.trim() || t('cardForm.defaultName'), number: spacedNumber(code) })
                    : spacedNumber(code)
                  : t('cardForm.typeNumber')}
              </Text>
            </View>
            <Text style={styles.explain}>{t('cardForm.explain')}</Text>
          </WhiteCard>

          <View style={styles.readBox}>
            <LinearGradient
              colors={BRAND_GRADIENT}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={styles.readIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <SymbolView name="sparkles" tintColor="#FFFFFF" size={17} />
            </LinearGradient>
            <Text style={styles.readText}>
              <Text style={styles.readTitle}>{`${t('cardForm.readTitle')}\n`}</Text>
              {t('cardForm.readText')}
            </Text>
          </View>

          <WhiteCard style={styles.fields}>
            <FieldRow label={t('cardForm.name')}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={t('cardForm.namePlaceholder')}
                placeholderTextColor={theme.placeholder}
                style={[styles.input, largeText && styles.inputStacked]}
                accessibilityLabel={t('cardForm.name')}
              />
            </FieldRow>
            <FieldRow label={t('cardForm.type')}>
              <TextInput
                value={docType}
                onChangeText={setDocType}
                placeholder={t('cardForm.typePlaceholder')}
                placeholderTextColor={theme.placeholder}
                style={[styles.input, largeText && styles.inputStacked]}
                accessibilityLabel={t('cardForm.type')}
              />
            </FieldRow>
            <FieldRow label={t('cardForm.number')}>
              <TextInput
                value={number}
                onChangeText={setNumber}
                placeholder={t('cardForm.numberPlaceholder')}
                placeholderTextColor={theme.placeholder}
                autoCapitalize="characters"
                autoCorrect={false}
                style={[styles.input, largeText && styles.inputStacked]}
                accessibilityLabel={t('cardForm.number')}
              />
            </FieldRow>
            <FieldRow label={t('cardForm.holder')} last>
              <Choice
                title={t('cardForm.holder')}
                value={personId}
                options={[NONE, ...(people ?? []).map((p) => p.id)]}
                labelFor={(id) => (id === NONE ? t('common.none') : (people?.find((p) => p.id === id)?.name ?? t('common.none')))}
                onChange={setPersonId}
              />
            </FieldRow>
          </WhiteCard>

          <PrimaryButton label={t('cardForm.saveButton')} disabled={!canSave} onPress={submit} style={styles.save} />
          {!title.trim() && <Text style={styles.note}>{t('cardForm.saveHint')}</Text>}
        </View>
      </ScrollView>

      <Modal
        visible={retake !== null}
        animationType={modalAnimation(reduceMotion)}
        presentationStyle="fullScreen"
        onRequestClose={() => setRetake(null)}>
        {retake && <CardCapture steps={[retake]} onDone={onRetaken} onCancel={() => setRetake(null)} />}
      </Modal>
    </>
  );
}

// The photo just taken (a file:// URI, not saved yet)
function LocalPhoto({ uri }: { uri: string }) {
  return <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />;
}

// "Rifai la foto": a pill at the bottom of a dark preview box, on translucent dark (both themes)
function RetakePill({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.retake, pressed && styles.pressed]}>
      <SymbolView name="arrow.triangle.2.circlepath.camera" tintColor="#FFFFFF" size={15} />
      <Text style={styles.retakeText}>{label}</Text>
    </Pressable>
  );
}

function DarkButton({ symbol, label, onPress }: { symbol: 'xmark' | 'camera.rotate'; label: string; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.darkButton, pressed && styles.pressed]}>
      <SymbolView name={symbol} tintColor="#FFFFFF" size={18} weight="semibold" />
    </Pressable>
  );
}

// Label on the left, the field on the right; with larger text the field goes under its label.
// The field has the same accessibilityLabel: the visible label is hidden from VoiceOver.
function FieldRow({ label, last = false, children }: { label: string; last?: boolean; children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  const large = useWindowDimensions().fontScale > 1.3;
  return (
    <View style={[styles.fieldRow, large && styles.fieldRowStacked, !last && styles.fieldDivider]}>
      <Text style={[styles.fieldLabel, large && styles.fieldLabelStacked]} accessibilityElementsHidden importantForAccessibility="no">
        {label}
      </Text>
      <View style={[styles.fieldControl, large && styles.fieldControlStacked]}>{children}</View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  dark: {
    backgroundColor: DARK,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: Spacing.side,
    paddingBottom: 20,
  },
  darkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  darkTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: FONTS.semiBold,
  },
  darkButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  frameArea: {
    marginTop: 22,
    alignSelf: 'center',
    width: 280,
    height: 176,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retake: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    minHeight: 34,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  retakeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FONTS.semiBold,
  },
  barcodeBox: {
    marginTop: 12,
    height: 140,
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: DARK,
    alignItems: 'center',
  },
  frameGlow: {
    borderRadius: 20,
  },
  tilted: {
    transform: [{ rotate: '-2deg' }],
    boxShadow: '0 12px 26px rgba(0, 0, 0, 0.35)',
    borderRadius: 11,
  },
  frame: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 3,
    borderColor: '#8B6CF0',
    borderRadius: 18,
  },
  recognized: {
    marginTop: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  fromPhotos: {
    marginTop: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
  },
  fromPhotosText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    textDecorationLine: 'underline',
  },
  recognizedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  body: {
    paddingHorizontal: Spacing.side,
    paddingTop: 22,
  },
  section: {
    marginTop: 2,
    marginBottom: 12,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: c.textSecondary,
  },
  coverRow: {
    alignItems: 'center',
  },
  coverShadow: {
    borderRadius: 15,
    boxShadow: '0 12px 26px rgba(28, 30, 70, 0.22)',
  },
  faceClip: {
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  caption: {
    marginTop: 10,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
    textAlign: 'center',
  },
  coverField: {
    marginTop: 14,
    marginBottom: 24,
  },
  codeCard: {
    padding: 16,
  },
  foundRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  found: {
    flexShrink: 1,
    minHeight: 28,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: MINT_TINT(c),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  foundText: {
    flexShrink: 1,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: MINT_TEXT(c),
  },
  link: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: c.accent,
  },
  kind: {
    marginTop: 12,
  },
  previewBox: {
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: c.separator,
    alignItems: 'center',
    gap: 8,
  },
  previewNumber: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    letterSpacing: 2.4,
    color: c.text,
    textAlign: 'center',
  },
  explain: {
    marginTop: 12,
    marginHorizontal: 2,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  readBox: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: c.paleLilac,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  readIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONTS.regular,
    color: c.textOnLilac,
  },
  readTitle: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  fields: {
    marginTop: 12,
    paddingVertical: 2,
    paddingHorizontal: 18,
  },
  fieldRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fieldRowStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 2,
    paddingTop: 10,
  },
  fieldLabelStacked: {
    width: 'auto',
  },
  fieldControlStacked: {
    alignItems: 'stretch',
  },
  fieldDivider: {
    borderBottomWidth: 1,
    borderBottomColor: c.separator,
  },
  fieldLabel: {
    width: 104,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  fieldControl: {
    flex: 1,
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  input: {
    alignSelf: 'stretch',
    minHeight: 44,
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: c.text,
    textAlign: 'right',
  },
  inputStacked: {
    textAlign: 'left',
  },
  save: {
    marginTop: 24,
  },
  note: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
    textAlign: 'center',
  },
});
