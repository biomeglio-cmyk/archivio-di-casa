import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addByScan, addFromFiles, addFromPhotos } from '@/capture/add-actions';
import { cropToGuideFrame } from '@/capture/crop-photo';
import type { FrameRect } from '@/capture/guide-frame';
import { isScannerAvailable } from '@/capture/scan-document';
import { startAddCard } from '@/capture/start-add-card';
import { Text } from '@/components/text';
import { FONTS } from '@/constants/typography';
import { encodePendingFiles, pagesToFiles } from '@/storage/pending-files';

const DARK = '#12142A';
const PAGE_RATIO = 210 / 297; // the frame has the shape of an A4 page
const FRAME_COLOR = '#8B6CF0';

type Mode = { key: string; label: string; onPress?: () => void };

// "+" (docs/design/Aggiungi.dc.html), full screen on dark: ✕, "Nuovo documento" and the flash; the
// camera in a rounded box with the page frame and a hint; Scansiona / Dalle foto / Da file PDF; the
// gallery button, the shutter and the count of pages. Each shot is cropped to the frame and added as
// a page; "N pagine ›" goes on to the form (Conferma). Our extras: "Tessera" and "A mano", and the
// iOS scanner (straightens the page by itself) when this phone has it.
// Expo Go has no live edge detection: the hint says to frame the page instead of "Documento trovato".
export default function AddDocumentScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [torch, setTorch] = useState(false);
  const [pages, setPages] = useState<string[]>([]);

  const frame = box ? pageFrame(box) : null;

  async function shoot() {
    if (!cameraRef.current || !ready || busy || !box || !frame) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      const page = await cropToGuideFrame(photo, frame, box);
      setPages((current) => [...current, page]);
    } finally {
      setBusy(false);
    }
  }

  function goOn() {
    if (pages.length === 0) return;
    router.replace({ pathname: '/new-document', params: { files: encodePendingFiles(pagesToFiles(pages)) } });
  }

  const modes: Mode[] = [
    { key: 'scan', label: 'Scansiona' },
    { key: 'photos', label: 'Dalle foto', onPress: addFromPhotos },
    { key: 'pdf', label: 'Da file PDF', onPress: addFromFiles },
    { key: 'card', label: 'Tessera', onPress: () => startAddCard('replace') },
    { key: 'manual', label: 'A mano', onPress: () => router.replace('/new-document') },
  ];

  const hint =
    pages.length === 0
      ? 'Inquadra il documento · tieni fermo il telefono'
      : `Pagina ${pages.length} presa · inquadra la successiva`;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.bar}>
        <DarkButton symbol="xmark" label="Chiudi" onPress={() => router.back()} />
        <Text style={styles.title} accessibilityRole="header">
          Nuovo documento
        </Text>
        <DarkButton
          symbol={torch ? 'bolt.fill' : 'bolt.slash'}
          label={torch ? 'Spegni il flash' : 'Accendi il flash'}
          onPress={() => setTorch((on) => !on)}
        />
      </View>

      <View style={styles.viewfinder} onLayout={(event: LayoutChangeEvent) => setBox(event.nativeEvent.layout)}>
        {permission?.granted ? (
          <>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torch}
              onCameraReady={() => setReady(true)}
            />
            {frame && (
              <View
                pointerEvents="none"
                style={[styles.frame, { left: frame.x, top: frame.y, width: frame.width, height: frame.height }]}
              />
            )}
            {isScannerAvailable() && (
              <Pressable onPress={addByScan} accessibilityRole="button" style={styles.scanner}>
                <SymbolView name="doc.viewfinder" tintColor="#FFFFFF" size={14} />
                <Text style={styles.scannerText}>Scanner automatico</Text>
              </Pressable>
            )}
            <View style={styles.hint} pointerEvents="none">
              <SymbolView name={pages.length ? 'checkmark.circle.fill' : 'viewfinder'} tintColor="#FFFFFF" size={16} />
              <Text style={styles.hintText}>{hint}</Text>
            </View>
          </>
        ) : (
          permission && (
            <View style={styles.permission}>
              <SymbolView name="camera" tintColor="#FFFFFF" size={40} />
              <Text style={styles.permissionTitle}>Serve la fotocamera</Text>
              <Text style={styles.permissionText}>Sottomano la usa solo per fotografare i tuoi documenti.</Text>
              <Pressable
                onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
                accessibilityRole="button"
                style={styles.permissionButton}>
                <Text style={styles.permissionButtonText}>{permission.canAskAgain ? 'Consenti' : 'Apri Impostazioni'}</Text>
              </Pressable>
            </View>
          )
        )}
      </View>

      <View style={styles.modes} accessibilityRole="tablist" accessibilityLabel="Come aggiungere">
        {modes.map((mode) => {
          const active = mode.key === 'scan';
          return (
            <Pressable
              key={mode.key}
              onPress={mode.onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.mode, active && styles.modeActive]}>
              <Text style={[styles.modeText, active && styles.modeTextActive]}>{mode.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.controls}>
        <Pressable onPress={addFromPhotos} accessibilityRole="button" accessibilityLabel="Scegli dalla galleria" style={styles.gallery}>
          <SymbolView name="photo.on.rectangle" tintColor="#FFFFFF" size={22} />
        </Pressable>
        <Pressable
          onPress={shoot}
          disabled={!ready || busy}
          accessibilityRole="button"
          accessibilityLabel="Scatta"
          style={({ pressed }) => [styles.shutter, (pressed || busy || !ready) && styles.dimmed]}>
          <View style={styles.shutterInner} />
        </Pressable>
        <Pressable
          onPress={goOn}
          disabled={pages.length === 0}
          accessibilityRole="button"
          accessibilityLabel={pages.length ? `Avanti con ${pages.length} pagine` : 'Nessuna pagina'}
          style={styles.count}>
          <Text style={styles.countNumber}>{pages.length}</Text>
          <Text style={styles.countLabel}>{pages.length ? 'avanti ›' : 'pagine'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// The page frame inside the camera box: as large as fits with room for the hint, centered
function pageFrame(box: { width: number; height: number }): FrameRect {
  const width = Math.min(box.width * 0.68, (box.height - 110) * PAGE_RATIO);
  const height = width / PAGE_RATIO;
  return { x: (box.width - width) / 2, y: (box.height - height) / 2 - 16, width, height };
}

function DarkButton({ symbol, label, onPress }: { symbol: SFSymbol; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.darkButton, pressed && styles.dimmed]}>
      <SymbolView name={symbol} tintColor="#FFFFFF" size={18} weight="semibold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DARK,
    paddingHorizontal: 20,
    gap: 18,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
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
  dimmed: {
    opacity: 0.5,
  },
  viewfinder: {
    flex: 1,
    borderRadius: 28,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: '#181A30',
  },
  frame: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: FRAME_COLOR,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 108, 240, 0.12)',
  },
  scanner: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  scannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
  hint: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  permission: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 28,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: FONTS.bold,
  },
  permissionText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 15,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 6,
    height: 44,
    paddingHorizontal: 22,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  permissionButtonText: {
    color: '#1C1E2E',
    fontSize: 15,
    fontFamily: FONTS.semiBold,
  },
  modes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  mode: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    justifyContent: 'center',
  },
  modeActive: {
    backgroundColor: '#FFFFFF',
  },
  modeText: {
    color: '#D2D2D7',
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  modeTextActive: {
    color: '#1C1E2E',
    fontFamily: FONTS.semiBold,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  gallery: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  count: {
    width: 64,
    alignItems: 'center',
    gap: 2,
  },
  countNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: FONTS.semiBold,
  },
  countLabel: {
    color: '#D2D2D7',
    fontSize: 12,
  },
});
