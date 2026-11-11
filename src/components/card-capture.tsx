import { CameraView, scanFromURLAsync, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { cropToGuideFrame } from '@/capture/crop-photo';
import { guideFrameRect } from '@/capture/guide-frame';
import { pickImageUri } from '@/capture/pick-files';
import { PrimaryButton } from '@/components/primary-button';
import { GuideFrameOverlay } from '@/components/guide-frame-overlay';
import { FONTS } from '@/constants/typography';
import { CARD_BARCODE_TYPES } from '@/constants/card-colors';

export type CardStep = 'front' | 'barcode';

// The code read by the camera (or from a QR photo); null = nothing read
export type ScannedCode = { value: string; type: string };

export type CardCaptureResult = {
  frontUri: string | null; // null = skipped
  barcodeUri: string | null; // the photo shown at the checkout; null = skipped
  code: ScannedCode | null;
};

type Props = {
  steps: CardStep[]; // ['front', 'barcode'] for a new card, one step to retake a photo
  onDone: (result: CardCaptureResult) => void;
  onCancel: () => void;
};

const STEP_TITLE: Record<CardStep, string> = {
  front: 'Foto del fronte',
  barcode: 'Fotografa il codice a barre',
};

// Full-screen camera for a card: 1) the front, 2) the barcode, read live while framing it.
// Every shot gets a "Rifai / Usa" preview; both steps can use the photo library or be skipped.
export function CardCapture({ steps, onDone, onCancel }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const frame = guideFrameRect(width, height);

  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const [result, setResult] = useState<CardCaptureResult>({ frontUri: null, barcodeUri: null, code: null });
  const [code, setCode] = useState<ScannedCode | null>(null); // last code seen by the camera
  const [previewUri, setPreviewUri] = useState<string | null>(null); // photo waiting for Rifai/Usa
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  // The scanner fires many times per second: update the state only when the code changes
  function onBarcodeScanned(scan: BarcodeScanningResult) {
    if (scan.data && scan.data !== code?.value) {
      setCode({ value: scan.data, type: scan.type });
    }
  }

  // Saves this step and goes to the next one, or finishes
  function next(uri: string | null) {
    const updated =
      step === 'front' ? { ...result, frontUri: uri } : { ...result, barcodeUri: uri, code: uri ? code : null };
    setPreviewUri(null);
    if (stepIndex + 1 < steps.length) {
      setResult(updated);
      setReady(false);
      setStepIndex(stepIndex + 1);
    } else {
      onDone(updated);
    }
  }

  async function shoot() {
    if (!cameraRef.current || !ready || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      setPreviewUri(await cropToGuideFrame(photo, frame, { width, height }));
    } finally {
      setBusy(false);
    }
  }

  async function fromLibrary() {
    try {
      const uri = await pickImageUri();
      if (!uri) return;
      if (step === 'barcode') {
        // From a photo iOS can only read QR codes; other codes are typed in the form
        const found = await scanFromURLAsync(uri, CARD_BARCODE_TYPES).catch(() => []);
        setCode(found[0]?.data ? { value: found[0].data, type: found[0].type } : null);
      }
      setPreviewUri(uri);
    } catch (error) {
      Alert.alert('Impossibile aprire la foto', String(error));
    }
  }

  // ---- Permission states ----

  if (!permission) {
    return <View style={styles.screen} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <SymbolView name="camera" tintColor="#FFFFFF" size={44} />
        <Text style={styles.permissionTitle}>Serve la fotocamera</Text>
        <Text style={styles.permissionText}>
          Sottomano usa la fotocamera per fotografare le tue carte e leggere il codice a barre.
        </Text>
        <View style={styles.permissionButton}>
          <PrimaryButton
            label={permission.canAskAgain ? 'Consenti' : 'Apri Impostazioni'}
            onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
          />
        </View>
        <Pressable onPress={onCancel} hitSlop={12}>
          <Text style={styles.link}>Annulla</Text>
        </Pressable>
      </View>
    );
  }

  // ---- Preview: Rifai / Usa ----

  if (previewUri) {
    return (
      <View style={styles.screen}>
        <Image source={{ uri: previewUri }} style={StyleSheet.absoluteFill} contentFit="contain" />
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.instruction}>
            {step === 'front' ? 'Fronte: si vede bene?' : code ? `Letto: ${code.value}` : 'Codice non letto'}
          </Text>
          {step === 'barcode' && !code && (
            <Text style={styles.hint}>Tieni la foto: il numero lo scrivi tu nel passo dopo.</Text>
          )}
        </View>
        <View style={[styles.previewBar, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable style={styles.secondaryButton} onPress={() => setPreviewUri(null)} accessibilityRole="button">
            <Text style={styles.secondaryLabel}>Rifai</Text>
          </Pressable>
          <View style={styles.flex}>
            <PrimaryButton label="Usa" onPress={() => next(previewUri)} />
          </View>
        </View>
      </View>
    );
  }

  // ---- Camera ----

  return (
    <View style={styles.screen}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onCameraReady={() => setReady(true)}
        barcodeScannerSettings={step === 'barcode' ? { barcodeTypes: CARD_BARCODE_TYPES } : undefined}
        onBarcodeScanned={step === 'barcode' ? onBarcodeScanned : undefined}
      />
      <GuideFrameOverlay frame={frame} />

      <View style={[styles.topBar, styles.topBarRow, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onCancel} hitSlop={12} accessibilityRole="button" accessibilityLabel="Chiudi">
          <SymbolView name="xmark" tintColor="#FFFFFF" size={22} />
        </Pressable>
        {steps.length > 1 && (
          <Text style={styles.stepCount}>
            {stepIndex + 1} di {steps.length}
          </Text>
        )}
      </View>

      <View style={[styles.overFrame, { bottom: height - frame.y + 12 }]}>
        <Text style={styles.instruction}>{STEP_TITLE[step]}</Text>
        {step === 'front' && <Text style={styles.hint}>Inquadra la carta dentro il riquadro</Text>}
      </View>

      {step === 'barcode' && (
        <View style={[styles.codeBadge, { top: frame.y + frame.height + 16 }, code && styles.codeBadgeFound]}>
          <SymbolView name={code ? 'checkmark.circle.fill' : 'barcode.viewfinder'} tintColor="#FFFFFF" size={18} />
          <Text style={styles.codeText} numberOfLines={2}>
            {code ? `Letto: ${code.value}` : 'Cerco il codice…'}
          </Text>
        </View>
      )}

      <View style={[styles.cameraBar, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.sideSlot}>
          <Pressable onPress={fromLibrary} hitSlop={12} accessibilityRole="button" accessibilityLabel="Scegli dalle foto">
            <SymbolView name="photo.on.rectangle" tintColor="#FFFFFF" size={28} />
          </Pressable>
        </View>
        <Pressable
          onPress={shoot}
          disabled={!ready || busy}
          accessibilityRole="button"
          accessibilityLabel="Scatta"
          style={({ pressed }) => [styles.shutter, (pressed || busy) && styles.shutterPressed]}>
          <View style={styles.shutterInner} />
        </Pressable>
        <View style={styles.sideSlot}>
          <Pressable onPress={() => next(null)} hitSlop={12} accessibilityRole="button">
            <Text style={styles.link}>Salta</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    gap: 6,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepCount: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    fontFamily: FONTS.medium,
  },
  overFrame: {
    position: 'absolute',
    left: 24,
    right: 24,
    gap: 4,
  },
  instruction: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: FONTS.semiBold,
    textAlign: 'center',
  },
  hint: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    textAlign: 'center',
  },
  codeBadge: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '86%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  codeBadgeFound: {
    backgroundColor: 'rgba(30, 140, 70, 0.9)',
  },
  codeText: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FONTS.medium,
  },
  cameraBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  sideSlot: {
    width: 64,
    alignItems: 'center',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: {
    opacity: 0.6,
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  previewBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  secondaryLabel: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: FONTS.semiBold,
  },
  link: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: FONTS.medium,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: FONTS.bold,
  },
  permissionText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 16,
    textAlign: 'center',
  },
  permissionButton: {
    alignSelf: 'stretch',
  },
});
