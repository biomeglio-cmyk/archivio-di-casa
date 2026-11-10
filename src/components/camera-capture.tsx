import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cropToGuideFrame } from '@/capture/crop-photo';
import { guideFrameRect } from '@/capture/guide-frame';
import { GradientButton } from '@/components/gradient-button';
import { GuideFrameOverlay } from '@/components/guide-frame-overlay';
import { FONTS } from '@/constants/brand';
import type { PendingFile } from '@/storage/pending-files';

type Side = 'front' | 'back';

type Props = {
  // Omitted: front, then back (optional). Set: shoot only that face (e.g. "Rifai il fronte").
  only?: Side;
  onDone: (files: PendingFile[]) => void;
  onCancel: () => void;
};

function instruction(side: Side, only: Side | undefined): string {
  if (side === 'front') return 'Inquadra il fronte del documento';
  return only ? 'Inquadra il retro del documento' : 'Ora gira il documento e inquadra il retro';
}

// Full-screen camera with the guide frame; every shot gets a "Rifai / Usa" preview.
// Used by the /capture screen and by "Modifica documento" (inside a full-screen Modal).
export function CameraCapture({ only, onDone, onCancel }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const frame = guideFrameRect(width, height);

  const [side, setSide] = useState<Side>(only ?? 'front');
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null); // photo waiting for Rifai/Usa
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  function finish(front: string, back: string | null) {
    const files: PendingFile[] = [{ uri: front, kind: 'image', side: 'front' }];
    if (back) files.push({ uri: back, kind: 'image', side: 'back' });
    onDone(files);
  }

  async function shoot() {
    if (!cameraRef.current || !ready || busy) return;
    setBusy(true);
    try {
      // quality 1 here: the crop below re-compresses once, avoiding a double JPEG loss
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      setPreviewUri(await cropToGuideFrame(photo, frame, { width, height }));
    } finally {
      setBusy(false);
    }
  }

  function acceptPhoto() {
    if (!previewUri) return;
    if (only) {
      onDone([{ uri: previewUri, kind: 'image', side: only }]);
    } else if (side === 'front') {
      setFrontUri(previewUri);
      setPreviewUri(null);
      setSide('back');
    } else if (frontUri) {
      finish(frontUri, previewUri);
    }
  }

  // ---- Permission states ----

  if (!permission) {
    return <View style={styles.screen} />; // still reading the permission status
  }

  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <SymbolView name="camera" tintColor="#FFFFFF" size={44} />
        <Text style={styles.permissionTitle}>Serve la fotocamera</Text>
        <Text style={styles.permissionText}>
          Sottomano usa la fotocamera solo per fotografare i tuoi documenti.
        </Text>
        <View style={styles.permissionButton}>
          <GradientButton
            label={permission.canAskAgain ? 'Consenti' : 'Apri Impostazioni'}
            onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
          />
        </View>
        <Pressable onPress={() => onCancel()} hitSlop={12}>
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
          <Text style={styles.instruction}>{side === 'front' ? 'Fronte' : 'Retro'}: si legge bene?</Text>
        </View>
        <View style={[styles.previewBar, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable style={styles.secondaryButton} onPress={() => setPreviewUri(null)}>
            <Text style={styles.secondaryLabel}>Rifai</Text>
          </Pressable>
          <View style={styles.flex}>
            <GradientButton label="Usa" onPress={acceptPhoto} />
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
      />
      {/* Overlays are siblings positioned on top of the camera, not its children */}
      <GuideFrameOverlay frame={frame} />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => onCancel()} hitSlop={12} accessibilityLabel="Chiudi">
          <SymbolView name="xmark" tintColor="#FFFFFF" size={22} />
        </Pressable>
      </View>

      <Text style={[styles.instruction, styles.instructionOverFrame, { top: frame.y - 56 }]}>
        {instruction(side, only)}
      </Text>

      <View style={[styles.cameraBar, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.sideSlot} />
        <Pressable
          onPress={shoot}
          disabled={!ready || busy}
          accessibilityLabel="Scatta"
          style={({ pressed }) => [styles.shutter, (pressed || busy) && styles.shutterPressed]}>
          <View style={styles.shutterInner} />
        </Pressable>
        <View style={styles.sideSlot}>
          {!only && side === 'back' && frontUri && (
            <Pressable onPress={() => finish(frontUri, null)} hitSlop={12}>
              <Text style={styles.link}>Salta</Text>
            </Pressable>
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  instruction: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: FONTS.titleSemiBold,
    textAlign: 'center',
  },
  instructionOverFrame: {
    position: 'absolute',
    left: 24,
    right: 24,
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
    fontFamily: FONTS.titleSemiBold,
  },
  link: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: FONTS.titleMedium,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: FONTS.titleBold,
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
