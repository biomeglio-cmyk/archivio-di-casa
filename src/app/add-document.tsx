import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addFromFiles, addFromPhotos } from '@/capture/add-actions';
import { cropToGuideFrame } from '@/capture/crop-photo';
import type { FrameRect } from '@/capture/guide-frame';
import { isScannerAvailable, scanDocument } from '@/capture/scan-document';
import { startAddCard } from '@/capture/start-add-card';
import { Text } from '@/components/text';
import { FONTS } from '@/constants/typography';
import { encodePendingFiles, pagesToFiles } from '@/storage/pending-files';
import { useLargestPictureSize } from '@/capture/picture-size';
import { type Palette } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

const DARK = '#12142A';
const PAGE_RATIO = 210 / 297; // the frame has the shape of an A4 page
const FRAME_COLOR = '#8B6CF0';

type Mode = { key: string; label: string; onPress?: () => void };

// "+" (docs/design/Aggiungi.dc.html), full screen on dark: ✕, "Nuovo documento" and the flash; the
// camera in a rounded box with the page frame and a hint; Scansiona / Dalle foto / Da file PDF; the
// gallery button, the shutter and the count of pages. Each shot is cropped to the frame and added as
// a page; "N pagine ›" goes on to the form (Conferma). Our extras: "Tessera" and "A mano".
// "Scansiona" is the iOS document scanner (VisionKit: finds the edges, shoots by itself, straightens
// the pages, several in a row): it opens right away with this screen, and again from the chip or the
// shutter. Its pages go to Nuovo documento. Only where there is no system scanner, our own camera
// with the page frame takes its place (no live edge detection: "Inquadra il documento").
export default function AddDocumentScreen() {
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const picture = useLargestPictureSize(cameraRef); // full sensor resolution, not the preview size
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [torch, setTorch] = useState(false);
  const [pages, setPages] = useState<string[]>([]);
  // The system scanner, unless this phone has none (then our camera)
  const [useOwnCamera, setUseOwnCamera] = useState(() => !isScannerAvailable());

  // "Scansiona": the iOS scanner; "Annulla" there leaves this screen as it is
  async function scan() {
    const result = await scanDocument();
    if (result === 'cancelled') return;
    if (result === 'unavailable') {
      setUseOwnCamera(true);
      return;
    }
    router.replace({ pathname: '/new-document', params: { files: encodePendingFiles(pagesToFiles(result.pages)) } });
  }

  // Opening on "Scansiona" starts the scanner at once, after the screen finished sliding up
  const scanOnOpen = useEffectEvent(() => scan());
  useEffect(() => {
    if (useOwnCamera) return;
    const timer = setTimeout(() => scanOnOpen(), 450);
    return () => clearTimeout(timer);
    // only when the screen opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    { key: 'scan', label: t('addDocument.modes.scan'), onPress: useOwnCamera ? undefined : scan },
    { key: 'photos', label: t('addDocument.modes.photos'), onPress: addFromPhotos },
    { key: 'pdf', label: t('addDocument.modes.pdf'), onPress: addFromFiles },
    { key: 'card', label: t('addDocument.modes.card'), onPress: () => startAddCard('replace') },
    { key: 'manual', label: t('addDocument.modes.manual'), onPress: () => router.replace('/new-document') },
  ];

  const hint =
    pages.length === 0
      ? t('addDocument.hintFirst')
      : t('addDocument.hintNext', { number: pages.length });

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      {/* Dark screen: light clock and battery in both themes */}
      <StatusBar style="light" />
      <View style={styles.bar}>
        <DarkButton symbol="xmark" label={t('common.close')} onPress={() => router.back()} />
        <Text style={styles.title} accessibilityRole="header">
          {t('addDocument.title')}
        </Text>
        {useOwnCamera ? (
          <DarkButton
            symbol={torch ? 'bolt.fill' : 'bolt.slash'}
            label={torch ? t('addDocument.flashOff') : t('addDocument.flashOn')}
            onPress={() => setTorch((on) => !on)}
          />
        ) : (
          // The iOS scanner has its own flash
          <View style={styles.barSpace} />
        )}
      </View>

      <View style={styles.viewfinder} onLayout={(event: LayoutChangeEvent) => setBox(event.nativeEvent.layout)}>
        {!useOwnCamera ? (
          <Pressable
            onPress={scan}
            accessibilityRole="button"
            accessibilityLabel={t('addDocument.scanWithIos')}
            style={styles.scannerIdle}>
            <View style={styles.sheet} accessibilityElementsHidden>
              <View style={[styles.sheetLine, { width: 70, height: 12, backgroundColor: '#CFC8C3' }]} />
              <View style={[styles.sheetLine, { width: 120, marginTop: 10 }]} />
              <View style={[styles.sheetLine, { width: 90 }]} />
              <View style={[styles.sheetLine, styles.sheetLineLight, { width: 160, marginTop: 14 }]} />
              <View style={[styles.sheetLine, styles.sheetLineLight, { width: 150 }]} />
              <View style={[styles.sheetLine, styles.sheetLineLight, { width: 110 }]} />
            </View>
            <View style={styles.sheetFrame} pointerEvents="none" />
            <View style={styles.hint} pointerEvents="none">
              <SymbolView name="doc.viewfinder" tintColor="#FFFFFF" size={16} />
              <Text style={styles.hintText}>{t('addDocument.tapToScan')}</Text>
            </View>
          </Pressable>
        ) : permission?.granted ? (
          <>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torch}
              pictureSize={picture.pictureSize}
              onCameraReady={() => {
                setReady(true);
                picture.onReady();
              }}
            />
            {frame && (
              <View
                pointerEvents="none"
                style={[styles.frame, { left: frame.x, top: frame.y, width: frame.width, height: frame.height }]}
              />
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
              <Text style={styles.permissionTitle}>{t('addDocument.permissionTitle')}</Text>
              <Text style={styles.permissionText}>{t('addDocument.permissionText')}</Text>
              <Pressable
                onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
                accessibilityRole="button"
                style={styles.permissionButton}>
                <Text style={styles.permissionButtonText}>{permission.canAskAgain ? t('addDocument.allow') : t('addDocument.openSettings')}</Text>
              </Pressable>
            </View>
          )
        )}
      </View>

      <View style={styles.modes} accessibilityRole="tablist" accessibilityLabel={t('addDocument.howToAdd')}>
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
        <Pressable onPress={addFromPhotos} accessibilityRole="button" accessibilityLabel={t('addDocument.chooseFromGallery')} style={styles.gallery}>
          <SymbolView name="photo.on.rectangle" tintColor="#FFFFFF" size={22} />
        </Pressable>
        <Pressable
          onPress={useOwnCamera ? shoot : scan}
          disabled={useOwnCamera && (!ready || busy)}
          accessibilityRole="button"
          accessibilityLabel={useOwnCamera ? t('addDocument.shoot') : t('addDocument.modes.scan')}
          style={({ pressed }) => [styles.shutter, (pressed || (useOwnCamera && (busy || !ready))) && styles.dimmed]}>
          <View style={styles.shutterInner} />
        </Pressable>
        <Pressable
          onPress={goOn}
          disabled={pages.length === 0}
          accessibilityRole="button"
          accessibilityLabel={pages.length ? t('addDocument.goOnWith', { count: pages.length }) : t('addDocument.noPages')}
          style={styles.count}>
          <Text style={styles.countNumber}>{pages.length}</Text>
          <Text style={styles.countLabel}>{pages.length ? t('addDocument.countNext') : t('addDocument.countPages')}</Text>
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
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
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
  barSpace: {
    width: 44,
  },
  scannerIdle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    width: 210,
    height: 290,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 4,
    backgroundColor: '#F4F1EE',
    transform: [{ rotate: '4deg' }],
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
    gap: 10,
  },
  sheetLine: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#DDD7D2',
  },
  sheetLineLight: {
    backgroundColor: '#E6E1DD',
  },
  sheetFrame: {
    position: 'absolute',
    width: 236,
    height: 316,
    borderWidth: 3,
    borderColor: FRAME_COLOR,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 108, 240, 0.12)',
    transform: [{ rotate: '4deg' }],
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
