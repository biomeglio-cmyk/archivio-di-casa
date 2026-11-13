import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { announce } from '@/a11y/accessibility';
import { useIconRow } from '@/components/icon-row';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { CARD_ASPECT_RATIO } from '@/capture/guide-frame';
import type { Category, DocumentFile } from '@/db/types';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { getDocumentsDirectory, resolveDocumentFile } from '@/storage/document-files';
import { previewDocumentFiles } from '@/storage/preview-files';
import { pageLabel, usesFrontBack } from '@/utils/page-labels';
import { type Palette } from '@/constants/theme';

type Props = {
  title: string;
  category: Pick<Category, 'builtinKey'>; // "Fronte/Retro" only for IDs and cards
  files: DocumentFile[];
};

const PAGE_ASPECT_RATIO = 3 / 4; // scanned pages are usually portrait sheets

// Photos and PDFs attached to a document: one photo alone (no label, no selector), two with a
// switch ("Fronte/Retro" for IDs and cards, else "Pagina 1/2"), 3+ swiped page by page
export function DocumentFilesView({ title, category, files }: Props) {
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const [imageIndex, setImageIndex] = useState(0);
  const [pagerWidth, setPagerWidth] = useState(0);

  if (files.length === 0) return null;

  const images = files.filter((f) => f.kind === 'image');
  const pdfs = files.filter((f) => f.kind === 'pdf');
  const shownIndex = Math.min(imageIndex, images.length - 1);
  const shownImage = images[shownIndex];
  const frontBack = usesFrontBack(category, images.length);
  const labelAt = (index: number) => pageLabel(index, images.length, frontBack) ?? t('documentFilesView.document');

  // Tapping the photo opens all faces full screen, starting from the one on screen
  async function openImages() {
    try {
      await previewDocumentFiles(title, category, images, shownIndex);
    } catch (error) {
      Alert.alert(t('documentFilesView.openFailed'), error instanceof Error ? error.message : String(error));
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
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / pagerWidth);
                if (index !== imageIndex) announce(t('viewDocument.pageOf', { number: index + 1, total: images.length }));
                setImageIndex(index);
              }}>
              {images.map((image, index) => (
                <View key={image.id} style={{ width: pagerWidth }}>
                  <ImageFile file={image} label={labelAt(index)} aspectRatio={PAGE_ASPECT_RATIO} onPress={openImages} />
                </View>
              ))}
            </ScrollView>
          )}
          <ThemedText type="small" themeColor="textSecondary" style={styles.pageCount}>
            {t('documentFilesView.pageOfSwipe', { number: shownIndex + 1, total: images.length })}
          </ThemedText>
        </View>
      )}

      {images.length === 2 && (
        <Segmented
          accessibilityLabel={t('a11y.segmented.side')}
          values={images.map((_, index) => labelAt(index))}
          selectedIndex={imageIndex}
          onChange={(index) => setImageIndex(index)}
        />
      )}

      {shownImage && !manyPages && (
        <ImageFile file={shownImage} label={labelAt(shownIndex)} aspectRatio={CARD_ASPECT_RATIO} onPress={openImages} />
      )}

      {pdfs.map((pdf) => (
        <PdfFile key={pdf.id} file={pdf} />
      ))}
    </View>
  );
}

type ImageFileProps = { file: DocumentFile; label: string; aspectRatio: number; onPress: () => void };

function ImageFile({ file, label, aspectRatio, onPress }: ImageFileProps) {
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const theme = useTheme();
  const stored = resolveDocumentFile(file.path);

  if (!stored.exists) return <MissingFile />;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t('documentFilesView.openFullScreen', { label })}>
      <Image
        source={{ uri: stored.uri }}
        style={[styles.image, { aspectRatio, backgroundColor: theme.surface }]}
        contentFit="contain"
        transition={150}
        accessibilityIgnoresInvertColors
      />
    </Pressable>
  );
}

function PdfFile({ file }: { file: DocumentFile }) {
  const styles = useThemedStyles(makeStyles);
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
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const theme = useTheme();
  const iconRow = useIconRow(); // larger text: the warning above the text
  return (
    <View style={[styles.missing, iconRow.row, { backgroundColor: theme.surface }]} accessible>
      <SymbolView name="exclamationmark.triangle" tintColor={theme.textSecondary} size={24} />
      <ThemedText themeColor="textSecondary" style={[styles.missingText, iconRow.texts]}>
        {t('documentFilesView.missingFile')}
      </ThemedText>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
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
  missingText: {
    flexShrink: 1,
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
