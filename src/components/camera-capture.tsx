import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { announce } from '@/a11y/accessibility';
import { Text } from '@/components/text';
import { cropToGuideFrame } from '@/capture/crop-photo';
import { guideFrameRect } from '@/capture/guide-frame';
import { PrimaryButton } from '@/components/primary-button';
import { GuideFrameOverlay } from '@/components/guide-frame-overlay';
import { FONTS } from '@/constants/typography';
import { useLargestPictureSize } from '@/capture/picture-size';
import { type Palette } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

type Props = {
  onDone: (uris: string[]) => void; // the photos in the order they were taken
  onCancel: () => void;
};

// Full-screen camera with the guide frame, used when the iOS scanner is not available.
// A document is N pages: after every shot "Rifai", "Aggiungi pagina" (keep it, shoot the next)
// or "Fine" (keep it and stop). One page is enough.
export function CameraCapture({ onDone, onCancel }: Props) {
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const picture = useLargestPictureSize(cameraRef); // full sensor resolution, not the preview size
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const frame = guideFrameRect(width, height);

  const [pages, setPages] = useState<string[]>([]); // photos already accepted
  const [previewUri, setPreviewUri] = useState<string | null>(null); // photo waiting for a choice
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  async function shoot() {
    if (!cameraRef.current || !ready || busy) return;
    setBusy(true);
    try {
      // quality 1 here: the crop below re-compresses once, avoiding a double JPEG loss
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      setPreviewUri(await cropToGuideFrame(photo, frame, { width, height }));
      announce(pageNumber === 1 ? t('cameraCapture.readable') : t('cameraCapture.pageReadable', { number: pageNumber }));
    } finally {
      setBusy(false);
    }
  }

  // "Aggiungi pagina": keep this photo and go back to the camera for the next one
  function addPage() {
    if (!previewUri) return;
    setPages([...pages, previewUri]);
    setPreviewUri(null);
    announce(t('a11y.cameraCapture.pageAdded', { number: pages.length + 1 }));
  }

  // "Fine" / "Usa": keep this photo and finish
  function finish() {
    if (!previewUri) return;
    onDone([...pages, previewUri]);
  }

  const pageNumber = pages.length + 1;

  // ---- Permission states ----

  if (!permission) {
    return <View style={styles.screen} />; // still reading the permission status
  }

  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <SymbolView name="camera" tintColor="#FFFFFF" size={44} accessibilityElementsHidden />
        <Text style={styles.permissionTitle}>{t('cameraCapture.permissionTitle')}</Text>
        <Text style={styles.permissionText}>{t('cameraCapture.permissionText')}</Text>
        <View style={styles.permissionButton}>
          <PrimaryButton
            label={permission.canAskAgain ? t('cameraCapture.allow') : t('cameraCapture.openSettings')}
            onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
          />
        </View>
        <Pressable onPress={() => onCancel()} hitSlop={12} accessibilityRole="button">
          <Text style={styles.link}>{t('common.cancel')}</Text>
        </Pressable>
      </View>
    );
  }

  // ---- Preview: Rifai / Aggiungi pagina / Fine ----

  if (previewUri) {
    return (
      <View style={styles.screen}>
        <Image
          source={{ uri: previewUri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          accessibilityIgnoresInvertColors
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('pageLabels.page', { number: pageNumber })}
        />
        <View style={[styles.topBar, styles.centeredBar, { paddingTop: insets.top + 8 }]}>
          <Text style={[styles.instruction, styles.scrim]} accessibilityRole="header">
            {pageNumber === 1 ? t('cameraCapture.readable') : t('cameraCapture.pageReadable', { number: pageNumber })}
          </Text>
        </View>
        <View style={[styles.previewBar, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable style={styles.secondaryButton} onPress={() => setPreviewUri(null)} accessibilityRole="button">
            <Text style={styles.secondaryLabel}>{t('cameraCapture.retake')}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={addPage} accessibilityRole="button">
            <Text style={styles.secondaryLabel}>{t('cameraCapture.addPage')}</Text>
          </Pressable>
          <View style={styles.flex}>
            <PrimaryButton label={t('common.done')} onPress={finish} />
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
        pictureSize={picture.pictureSize}
        onCameraReady={() => {
          setReady(true);
          picture.onReady();
        }}
      />
      {/* Overlays are siblings positioned on top of the camera, not its children */}
      <GuideFrameOverlay frame={frame} />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => onCancel()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={styles.closeButton}>
          <SymbolView name="xmark" tintColor="#FFFFFF" size={22} />
        </Pressable>
      </View>

      {/* On a dark pill: readable over any scene */}
      <View style={[styles.instructionOverFrame, { top: frame.y - 56 }]} pointerEvents="none">
        <Text style={[styles.instruction, styles.scrim]}>
          {pageNumber === 1 ? t('cameraCapture.frameDocument') : t('cameraCapture.framePage', { number: pageNumber })}
        </Text>
      </View>

      <View style={[styles.cameraBar, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.sideSlot} />
        <Pressable
          onPress={shoot}
          disabled={!ready || busy}
          accessibilityRole="button"
          accessibilityLabel={t('cameraCapture.shoot')}
          accessibilityState={{ disabled: !ready || busy, busy }}
          style={({ pressed }) => [styles.shutter, (pressed || busy) && styles.shutterPressed]}>
          <View style={styles.shutterInner} />
        </Pressable>
        <View style={styles.sideSlot}>
          {/* Changed idea after "Aggiungi pagina": finish with the pages already taken */}
          {pages.length > 0 && (
            <Pressable
              onPress={() => onDone(pages)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('cameraCapture.finishWithPages', { count: pages.length })}
              style={styles.scrimButton}>
              <Text style={styles.link}>{t('common.done')}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
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
    fontFamily: FONTS.semiBold,
    textAlign: 'center',
  },
  centeredBar: {
    justifyContent: 'center',
  },
  instructionOverFrame: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  scrim: {
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)', // readable over any scene
  },
  scrimButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
    minWidth: 64,
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)', // white labels stay readable over a white page
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  secondaryLabel: {
    color: '#FFFFFF',
    fontSize: 17,
    textAlign: 'center', // \"Aggiungi pagina\" wraps on two lines with large text
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
