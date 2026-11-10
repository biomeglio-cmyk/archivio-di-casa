import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { fileLabel } from '@/components/attachment-strip';
import { ThemedText } from '@/components/themed-text';
import { CARD_ASPECT_RATIO } from '@/capture/guide-frame';
import type { DocumentFile } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { getDocumentsDirectory, resolveDocumentFile } from '@/storage/document-files';
import { previewDocumentFiles } from '@/storage/preview-files';

type Props = {
  title: string;
  files: DocumentFile[];
};

const PAGE_ASPECT_RATIO = 3 / 4; // scanned pages are usually portrait sheets

// Photos (with a Fronte/Retro switch, or swiped page by page for a scan of 3+ pages)
// and PDFs attached to a document
export function DocumentFilesView({ title, files }: Props) {
  const [imageIndex, setImageIndex] = useState(0);
  const [pagerWidth, setPagerWidth] = useState(0);

  if (files.length === 0) return null;

  const images = files.filter((f) => f.kind === 'image');
  const pdfs = files.filter((f) => f.kind === 'pdf');
  const shownIndex = Math.min(imageIndex, images.length - 1);
  const shownImage = images[shownIndex];

  // Tapping the photo opens all faces full screen, starting from the one on screen
  async function openImages() {
    try {
      await previewDocumentFiles(title, images, shownIndex);
    } catch (error) {
      Alert.alert('Impossibile aprire il documento', error instanceof Error ? error.message : String(error));
    }
  }

  const manyPages = images.length > 2;

  return (
    <View style={styles.container}>
      {manyPages && (
        <View onLayout={(event) => setPagerWidth(event.nativeEvent.layout.width)}>
          {pagerWidth > 0 && (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) =>
                setImageIndex(Math.round(event.nativeEvent.contentOffset.x / pagerWidth))
              }>
              {images.map((image) => (
                <View key={image.id} style={{ width: pagerWidth }}>
                  <ImageFile file={image} label={fileLabel(image, images.length)} aspectRatio={PAGE_ASPECT_RATIO} onPress={openImages} />
                </View>
              ))}
            </ScrollView>
          )}
          <ThemedText type="small" themeColor="textSecondary" style={styles.pageCount}>
            {`Pagina ${shownIndex + 1} di ${images.length} · scorri per sfogliare`}
          </ThemedText>
        </View>
      )}

      {images.length === 2 && (
        <SegmentedControl
          values={images.map((image) => fileLabel(image, images.length))}
          selectedIndex={imageIndex}
          onChange={(event) => setImageIndex(event.nativeEvent.selectedSegmentIndex)}
        />
      )}

      {shownImage && !manyPages && (
        <ImageFile file={shownImage} label={fileLabel(shownImage, images.length)} aspectRatio={CARD_ASPECT_RATIO} onPress={openImages} />
      )}

      {pdfs.map((pdf) => (
        <PdfFile key={pdf.id} file={pdf} />
      ))}
    </View>
  );
}

type ImageFileProps = { file: DocumentFile; label: string; aspectRatio: number; onPress: () => void };

function ImageFile({ file, label, aspectRatio, onPress }: ImageFileProps) {
  const theme = useTheme();
  const stored = resolveDocumentFile(file.path);

  if (!stored.exists) return <MissingFile />;

  return (
    <Pressable onPress={onPress} accessibilityLabel={`${label}, apri a schermo intero`}>
      <Image
        source={{ uri: stored.uri }}
        style={[styles.image, { aspectRatio, backgroundColor: theme.surface }]}
        contentFit="contain"
        transition={150}
      />
    </Pressable>
  );
}

function PdfFile({ file }: { file: DocumentFile }) {
  const theme = useTheme();
  const stored = resolveDocumentFile(file.path);

  if (!stored.exists) return <MissingFile />;

  return (
    // WKWebView renders PDFs natively; it may only read files inside our documents folder
    <View style={[styles.pdfFrame, { borderColor: theme.backgroundSelected }]}>
      <WebView
        source={{ uri: stored.uri }}
        originWhitelist={['*']}
        allowingReadAccessToURL={getDocumentsDirectory().uri}
        style={styles.pdf}
      />
    </View>
  );
}

function MissingFile() {
  const theme = useTheme();
  return (
    <View style={[styles.missing, { backgroundColor: theme.surface }]}>
      <SymbolView name="exclamationmark.triangle" tintColor={theme.textSecondary} size={24} />
      <ThemedText themeColor="textSecondary">File non trovato sul telefono.</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  image: {
    width: '100%',
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  pageCount: {
    textAlign: 'center',
    marginTop: 8,
  },
  pdfFrame: {
    height: 440,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  pdf: {
    flex: 1,
  },
  missing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
});
