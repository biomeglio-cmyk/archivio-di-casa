import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
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

// Photos (with a Fronte/Retro switch) and PDFs attached to a document
export function DocumentFilesView({ title, files }: Props) {
  const [imageIndex, setImageIndex] = useState(0);

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

  return (
    <View style={styles.container}>
      {images.length > 1 && (
        <SegmentedControl
          values={images.map(fileLabel)}
          selectedIndex={imageIndex}
          onChange={(event) => setImageIndex(event.nativeEvent.selectedSegmentIndex)}
        />
      )}

      {shownImage && <ImageFile file={shownImage} onPress={openImages} />}

      {pdfs.map((pdf) => (
        <PdfFile key={pdf.id} file={pdf} />
      ))}
    </View>
  );
}

function ImageFile({ file, onPress }: { file: DocumentFile; onPress: () => void }) {
  const theme = useTheme();
  const stored = resolveDocumentFile(file.path);

  if (!stored.exists) return <MissingFile />;

  return (
    <Pressable onPress={onPress} accessibilityLabel={`${fileLabel(file)}, apri a schermo intero`}>
      <Image
        source={{ uri: stored.uri }}
        style={[styles.image, { backgroundColor: theme.backgroundElement }]}
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
    <View style={[styles.missing, { backgroundColor: theme.backgroundElement }]}>
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
    aspectRatio: CARD_ASPECT_RATIO,
    borderRadius: 16,
    borderCurve: 'continuous',
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
