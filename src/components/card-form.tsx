import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { Colors, Spacing, softTint, onSoftTint } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { listPeople } from '@/db/people';
import type { CoverMode } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { barcodeTypeName, codeKindOf, generateBarcode, typeForKind, type CodeKind } from '@/utils/barcode';

const NONE = 0; // no person (ids start at 1)
const DARK = '#12142A';
const MINT_TINT = softTint('#E6F7F0', '69, 182, 142');
const MINT_TEXT = onSoftTint('#1F7A5A', '#6FD3AE');

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
  const insets = useSafeAreaInsets();
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
    ? `Trovato: ${kind === 'qr' ? typeName : `codice a barre ${typeName ?? ''}`.trim()}`
    : code
      ? 'Codice scritto a mano'
      : 'Nessun codice letto';
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
      Alert.alert('Impossibile aprire la foto', String(error));
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
      Alert.alert('Impossibile salvare', error instanceof Error ? error.message : String(error));
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
            <DarkButton symbol="xmark" label="Chiudi" onPress={onCancel} />
            <Text style={styles.darkTitle} accessibilityRole="header">
              {heading}
            </Text>
            <DarkButton symbol="camera.rotate" label="Scatta di nuovo" onPress={retakeFront} />
          </View>
          <View style={styles.frameArea}>
            <LinearGradient colors={['#33365A', '#1C1E38']} style={[StyleSheet.absoluteFill, styles.frameGlow]} />
            <View style={styles.tilted}>{coverImage(232, 146)}</View>
            <View style={styles.frame} pointerEvents="none" />
          </View>
          <View style={styles.recognized}>
            <SymbolView name={frontUri ? 'checkmark.circle.fill' : 'camera'} tintColor="#FFFFFF" size={16} />
            <Text style={styles.recognizedText}>{frontUri ? 'Tessera riconosciuta' : 'Tocca Scatta di nuovo per fotografarla'}</Text>
          </View>
          {/* Ours: the front from the photo library (e.g. a macro shot made with the Camera app) */}
          <Pressable onPress={frontFromLibrary} accessibilityRole="button" hitSlop={8} style={styles.fromPhotos}>
            <SymbolView name="photo.on.rectangle" tintColor="#FFFFFF" size={15} />
            <Text style={styles.fromPhotosText}>Dalle foto</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={styles.section}>Copertina</Text>
          <View style={styles.coverRow}>
            <View style={styles.coverShadow}>{coverImage(300, 188)}</View>
          </View>
          <Text style={styles.caption}>
            {showPhoto ? 'Ritagliata e raddrizzata dalla foto della tessera' : 'Il colore della tessera, con il nome e il numero'}
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

          <Text style={styles.section}>Codice da mostrare alla cassa</Text>
          <WhiteCard style={styles.codeCard}>
            <View style={styles.foundRow}>
              <View style={styles.found}>
                <SymbolView name={readByCamera ? 'checkmark' : code ? 'keyboard' : 'questionmark'} tintColor={MINT_TEXT} size={12} weight="bold" />
                <Text style={styles.foundText}>{found}</Text>
              </View>
              <Pressable onPress={() => setRetake('barcode')} accessibilityRole="button" hitSlop={10}>
                <Text style={styles.link}>{barcodeUri ? 'Rifai la foto' : 'Fotografa il codice'}</Text>
              </Pressable>
            </View>
            <View style={styles.kind}>
              <Segmented
                values={['Codice a barre', 'QR code']}
                selectedIndex={kind === 'bar' ? 0 : 1}
                onChange={(index) => setKind(index === 0 ? 'bar' : 'qr')}
              />
            </View>
            <View style={styles.previewBox}>
              {preview ? (
                <GeneratedCode barcode={preview} maxWidth={260} maxHeight={kind === 'qr' ? 120 : 86} />
              ) : (
                <SymbolView name={kind === 'qr' ? 'qrcode' : 'barcode'} tintColor={Colors.current.dashed} size={56} />
              )}
              <Text style={styles.previewNumber}>
                {code ? (kind === 'qr' ? `${title.trim() || 'Tessera'} · ${spacedNumber(code)}` : spacedNumber(code)) : 'Scrivi il numero qui sotto'}
              </Text>
            </View>
            <Text style={styles.explain}>
              Sottomano riconosce da solo se la tessera ha un codice a barre o un QR code. Alla cassa lo mostra grande, con
              lo schermo al massimo della luminosità.
            </Text>
          </WhiteCard>

          <View style={styles.readBox}>
            <LinearGradient colors={BRAND_GRADIENT} start={GRADIENT_START} end={GRADIENT_END} style={styles.readIcon}>
              <SymbolView name="sparkles" tintColor="#FFFFFF" size={17} />
            </LinearGradient>
            <Text style={styles.readText}>
              <Text style={styles.readTitle}>{'Dati letti dalla tessera\n'}</Text>
              Controlla e correggi se serve.
            </Text>
          </View>

          <WhiteCard style={styles.fields}>
            <FieldRow label="Nome">
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Es. Supermercato"
                placeholderTextColor={Colors.current.textSecondary}
                style={styles.input}
                accessibilityLabel="Nome"
              />
            </FieldRow>
            <FieldRow label="Tipo">
              <TextInput
                value={docType}
                onChangeText={setDocType}
                placeholder="Es. Carta fedeltà"
                placeholderTextColor={Colors.current.textSecondary}
                style={styles.input}
                accessibilityLabel="Tipo"
              />
            </FieldRow>
            <FieldRow label="Numero">
              <TextInput
                value={number}
                onChangeText={setNumber}
                placeholder="Es. 0400 2219 8876"
                placeholderTextColor={Colors.current.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                style={styles.input}
                accessibilityLabel="Numero"
              />
            </FieldRow>
            <FieldRow label="Intestata a" last>
              <Choice
                title="Intestata a"
                value={personId}
                options={[NONE, ...(people ?? []).map((p) => p.id)]}
                labelFor={(id) => (id === NONE ? 'Nessuno' : (people?.find((p) => p.id === id)?.name ?? 'Nessuno'))}
                onChange={setPersonId}
              />
            </FieldRow>
          </WhiteCard>

          <PrimaryButton label="Salva tessera" disabled={!canSave} onPress={submit} style={styles.save} />
          {!title.trim() && <Text style={styles.note}>Per salvare scrivi il nome della tessera.</Text>}
        </View>
      </ScrollView>

      <Modal visible={retake !== null} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setRetake(null)}>
        {retake && <CardCapture steps={[retake]} onDone={onRetaken} onCancel={() => setRetake(null)} />}
      </Modal>
    </>
  );
}

// The photo just taken (a file:// URI, not saved yet)
function LocalPhoto({ uri }: { uri: string }) {
  return <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />;
}

function DarkButton({ symbol, label, onPress }: { symbol: 'xmark' | 'camera.rotate'; label: string; onPress: () => void }) {
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

function FieldRow({ label, last = false, children }: { label: string; last?: boolean; children: ReactNode }) {
  return (
    <View style={[styles.fieldRow, !last && styles.fieldDivider]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldControl}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.current.background,
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
    color: Colors.current.textSecondary,
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
    color: Colors.current.textSecondary,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  found: {
    flexShrink: 1,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: MINT_TINT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  foundText: {
    flexShrink: 1,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: MINT_TEXT,
  },
  link: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: Colors.current.accent,
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
    borderColor: Colors.current.separator,
    alignItems: 'center',
    gap: 8,
  },
  previewNumber: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    letterSpacing: 2.4,
    color: Colors.current.text,
    textAlign: 'center',
  },
  explain: {
    marginTop: 12,
    marginHorizontal: 2,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
  },
  readBox: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: Colors.current.paleLilac,
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
    color: Colors.current.textOnLilac,
  },
  readTitle: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: Colors.current.text,
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
  fieldDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.current.separator,
  },
  fieldLabel: {
    width: 104,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
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
    color: Colors.current.text,
    textAlign: 'right',
  },
  save: {
    marginTop: 24,
  },
  note: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
    textAlign: 'center',
  },
});
