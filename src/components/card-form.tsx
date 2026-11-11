import { Host, Picker } from '@expo/ui';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { scanDocument } from '@/capture/scan-document';
import { CardCapture, type CardCaptureResult, type CardStep } from '@/components/card-capture';
import { CardFace } from '@/components/card-face';
import { CoverField } from '@/components/cover-field';
import { FieldLabel, FormField, TextField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { WhiteCard } from '@/components/white-card';
import { BRAND_COLOR } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { listPeople } from '@/db/people';
import type { CoverMode } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';

const NONE = 0; // Picker values must be numbers: 0 = no person (ids start at 1)

export type CardFormValues = {
  title: string;
  personId: number | null;
  barcodeValue: string | null;
  barcodeType: string | null; // kept only while the number is the one read by the camera
  cardColor: string; // its "Colore" cover
  coverMode: CoverMode | null; // "Copertina"; null = automatic (Foto when there is a photo)
  frontUri: string | null; // photo of the front (file:// URI)
  barcodeUri: string | null; // photo of the barcode
};

type Props = {
  initial: CardFormValues;
  onSubmit: (values: CardFormValues, changed: { front: boolean; barcode: boolean }) => Promise<void>;
};

// "Nuova carta" and "Modifica carta": the two photos (each can be retaken), name, person,
// the number of the code and a background color for when there is no photo
export function CardForm({ initial, onSubmit }: Props) {
  const theme = useTheme();
  const { data: people } = useDbQuery(listPeople, []);

  const [title, setTitle] = useState(initial.title);
  const [personId, setPersonId] = useState(initial.personId ?? NONE);
  const [number, setNumber] = useState(initial.barcodeValue ?? '');
  const [scanned, setScanned] = useState({ value: initial.barcodeValue, type: initial.barcodeType });
  const [cardColor, setCardColor] = useState(initial.cardColor);
  const [coverMode, setCoverMode] = useState<CoverMode | null>(initial.coverMode);
  const [frontUri, setFrontUri] = useState(initial.frontUri);
  const [barcodeUri, setBarcodeUri] = useState(initial.barcodeUri);
  const [changed, setChanged] = useState({ front: false, barcode: false });
  const [retake, setRetake] = useState<CardStep | null>(null); // full-screen camera for one photo
  const [saving, setSaving] = useState(false);

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
      }
    }
  }

  // The front: iOS scanner first (straight, clean crop); without it, the app camera.
  // "Annulla" in the scanner leaves the form as it was.
  async function retakeFront() {
    const result = await scanDocument({ tip: false });
    if (result === 'cancelled') return;
    if (result === 'unavailable') {
      setRetake('front');
      return;
    }
    setFrontUri(result.pages[0]);
    setChanged((c) => ({ ...c, front: true }));
  }

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    const code = number.trim();
    try {
      await onSubmit(
        {
          title,
          personId: personId === NONE ? null : personId,
          barcodeValue: code || null,
          // Typed or changed by hand → the format is unknown
          barcodeType: code && code === scanned.value ? scanned.type : null,
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

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}>
        {/* The two photos, side by side: the card as it will look, and the barcode */}
        <View style={styles.photos}>
          <PhotoSlot label="Fronte" onPress={retakeFront} action={frontUri ? 'Rifai' : 'Fotografa'}>
            <CardFace card={{ title: title || 'Nuova carta', firstImagePath: null, cardColor, personName: null }} width={150} />
            {frontUri && <Image source={{ uri: frontUri }} style={styles.photoOver} contentFit="cover" />}
          </PhotoSlot>
          <PhotoSlot label="Codice" onPress={() => setRetake('barcode')} action={barcodeUri ? 'Rifai' : 'Fotografa'}>
            <WhiteCard style={styles.barcodeBox}>
              {barcodeUri ? (
                <Image source={{ uri: barcodeUri }} style={StyleSheet.absoluteFill} contentFit="contain" />
              ) : (
                <SymbolView name="barcode" tintColor={theme.textSecondary} size={36} />
              )}
            </WhiteCard>
          </PhotoSlot>
        </View>

        <FormField label="Nome" required>
          <TextField value={title} onChangeText={setTitle} placeholder="Es. Tessera Esselunga" returnKeyType="done" />
        </FormField>

        <FormField label="Numero del codice">
          <TextField
            value={number}
            onChangeText={setNumber}
            placeholder="Es. 2701234567890"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            {number.trim() && number.trim() === scanned.value
              ? 'Letto dalla fotocamera.'
              : 'Scrivilo se non è stato letto: alla cassa si può digitare.'}
          </ThemedText>
        </FormField>

        {people && (
          <WhiteCard style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLabel}>
                <FieldLabel label="Persona" />
              </View>
              <View style={styles.rowControl}>
                <Host matchContents>
                  <Picker selectedValue={personId} onValueChange={setPersonId}>
                    <Picker.Item label="Nessuna" value={NONE} />
                    {people.map((p) => (
                      <Picker.Item key={p.id} label={p.name} value={p.id} />
                    ))}
                  </Picker>
                </Host>
              </View>
            </View>
          </WhiteCard>
        )}

        <CoverField
          mode={coverMode ?? (frontUri ? 'photo' : 'color')}
          onModeChange={setCoverMode}
          color={cardColor}
          onColorChange={(color) => color && setCardColor(color)}
          hasPhoto={Boolean(frontUri)}
        />

        <View style={styles.footer}>
          <PrimaryButton label="Salva" disabled={!canSave} onPress={submit} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            {title.trim() ? '* Campo obbligatorio' : 'Per salvare scrivi il nome della carta.'}
          </ThemedText>
        </View>
      </ScrollView>

      <Modal visible={retake !== null} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setRetake(null)}>
        {retake && <CardCapture steps={[retake]} onDone={onRetaken} onCancel={() => setRetake(null)} />}
      </Modal>
    </>
  );
}

// Photo with its label and a "Rifai" button under it
function PhotoSlot({ label, action, onPress, children }: { label: string; action: string; onPress: () => void; children: ReactNode }) {
  return (
    <View style={styles.slot}>
      <View style={styles.slotPhoto}>{children}</View>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${action}: ${label}`} hitSlop={8}>
        <Text style={styles.slotAction}>{action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 16,
    paddingHorizontal: Spacing.side,
    paddingBottom: 40,
    gap: 20,
  },
  photos: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  slot: {
    alignItems: 'center',
    gap: 4,
  },
  slotPhoto: {
    width: 150,
    height: 95, // 150 / 1.586
    borderRadius: 12,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  photoOver: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  barcodeBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotAction: {
    color: BRAND_COLOR,
    fontSize: 17,
    fontFamily: FONTS.medium,
  },
  hint: {
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 52,
    paddingVertical: 8,
  },
  rowLabel: {
    flexShrink: 1,
  },
  rowControl: {
    flexShrink: 1,
    maxWidth: '65%',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  footer: {
    gap: 8,
  },
  note: {
    textAlign: 'center',
  },
});
