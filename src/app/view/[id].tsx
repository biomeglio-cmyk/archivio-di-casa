import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { Text } from '@/components/text';
import { FONTS } from '@/constants/typography';
import { getDocumentDetail, listDocumentFiles } from '@/db/documents';
import type { DocumentFile } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { getDocumentsDirectory, resolveDocumentFile } from '@/storage/document-files';

const BACKGROUND = '#1A1C30';
const PAGE_SHARE = 330 / 390; // page width on the screen at 100% (design)
const PAGE_GAP = 18;
const ZOOM_MIN = 1;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.25;
const A4_RATIO = 210 / 297;

// "Visualizza" (docs/design/Visualizza.dc.html): the pages one under the other on a dark
// background; on top ✕, the name with "N pagine · scorri in basso" and Invia; at the bottom the
// zoom (100–200%) and "Pag. X di N". A PDF is drawn by iOS (WKWebView) in the same frame: its pages
// scroll inside it and the zoom makes it wider; pinch zoom works too.
export default function ViewDocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = Number(id);
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { data: document } = useDbQuery((db) => getDocumentDetail(db, documentId), [documentId]);
  const { data: files } = useDbQuery((db) => listDocumentFiles(db, documentId), [documentId]);
  const [zoom, setZoom] = useState(1);
  const [ratios, setRatios] = useState<Record<number, number>>({}); // width / height of each photo
  const [page, setPage] = useState(1);

  const pdf = files?.find((f) => f.kind === 'pdf') ?? null;
  const images = (files ?? []).filter((f) => f.kind === 'image');
  const pageCount = pdf ? null : images.length;
  const pageWidth = Math.round(screenWidth * PAGE_SHARE * zoom);
  const contentWidth = Math.max(screenWidth, pageWidth + 60);
  const topBar = insets.top + 76;

  const subtitle = pdf
    ? 'PDF · scorri in basso'
    : pageCount === 1
      ? '1 pagina'
      : `${pageCount ?? 0} pagine · scorri in basso`;

  // The page whose top has passed the middle of the screen
  function onScroll(y: number) {
    if (!pageCount) return;
    let top = topBar;
    for (let index = 0; index < images.length; index++) {
      const height = pageWidth / (ratios[images[index].id] ?? A4_RATIO);
      if (y + screenHeight / 2 < top + height + PAGE_GAP) {
        setPage(index + 1);
        return;
      }
      top += height + PAGE_GAP;
    }
    setPage(images.length);
  }

  const send = () => router.push({ pathname: '/send', params: { ids: String(documentId) } });

  return (
    <View style={styles.screen}>
      {pdf ? (
        <ScrollView horizontal contentContainerStyle={{ width: contentWidth }} bounces={false}>
          <View
            style={[styles.pdfFrame, { width: contentWidth, paddingTop: topBar, paddingBottom: insets.bottom + 100 }]}>
            <PdfPage file={pdf} width={pageWidth} />
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          onScroll={(event) => onScroll(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={64}
          contentContainerStyle={{ paddingTop: topBar, paddingBottom: insets.bottom + 120 }}>
          <ScrollView horizontal contentContainerStyle={[styles.pages, { width: contentWidth }]} bounces={false}>
            {images.map((file, index) => (
              <Image
                key={file.id}
                source={{ uri: resolveDocumentFile(file.path).uri }}
                onLoad={(event) => {
                  const { width, height } = event.source;
                  if (width > 0 && height > 0) setRatios((current) => ({ ...current, [file.id]: width / height }));
                }}
                style={[styles.page, { width: pageWidth, aspectRatio: ratios[file.id] ?? A4_RATIO }]}
                contentFit="contain"
                accessibilityLabel={`Pagina ${index + 1} di ${images.length}`}
              />
            ))}
            {files && images.length === 0 && <Text style={styles.empty}>Questo documento non ha pagine.</Text>}
          </ScrollView>
        </ScrollView>
      )}

      <LinearGradient
        colors={[BACKGROUND, 'rgba(26, 28, 48, 0)']}
        style={[styles.top, { paddingTop: insets.top + 8 }]}
        pointerEvents="box-none">
        <RoundButton symbol="xmark" label="Chiudi" onPress={() => router.back()} />
        <View style={styles.titleBox}>
          <Text style={styles.title} numberOfLines={1}>
            {document?.title ?? ''}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <RoundButton symbol="square.and.arrow.up" label="Invia" onPress={send} />
      </LinearGradient>

      <View
        style={[styles.zoomBar, { bottom: insets.bottom + 30 }]}
        accessibilityRole="toolbar"
        accessibilityLabel="Zoom">
        <RoundButton
          symbol="minus"
          label="Riduci"
          transparent
          disabled={zoom <= ZOOM_MIN}
          onPress={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
        />
        <Text style={styles.percent} accessibilityLiveRegion="polite">
          {Math.round(zoom * 100)}%
        </Text>
        <RoundButton
          symbol="plus"
          label="Ingrandisci"
          transparent
          disabled={zoom >= ZOOM_MAX}
          onPress={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
        />
        <View style={styles.divider} />
        <Text style={styles.pageLabel}>{pageCount ? `Pag. ${page} di ${pageCount}` : 'PDF'}</Text>
      </View>
    </View>
  );
}

// WKWebView draws the PDF; it may only read files inside our documents folder
function PdfPage({ file, width }: { file: DocumentFile; width: number }) {
  return (
    <WebView
      source={{ uri: resolveDocumentFile(file.path).uri }}
      originWhitelist={['*']}
      allowingReadAccessToURL={getDocumentsDirectory().uri}
      style={[styles.pdf, { width }]}
      containerStyle={styles.pdfContainer}
    />
  );
}

type RoundButtonProps = {
  symbol: SFSymbol;
  label: string;
  onPress: () => void;
  transparent?: boolean;
  disabled?: boolean;
};

function RoundButton({ symbol, label, onPress, transparent = false, disabled = false }: RoundButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.round,
        !transparent && styles.roundFilled,
        (pressed || disabled) && styles.dimmed,
      ]}>
      <SymbolView name={symbol} tintColor="#FFFFFF" size={18} weight="semibold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  pages: {
    alignItems: 'center',
    gap: PAGE_GAP,
  },
  page: {
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
  },
  empty: {
    marginTop: 80,
    color: '#C9CCDA',
    fontSize: 15,
    fontFamily: FONTS.regular,
  },
  pdfFrame: {
    flex: 1,
    alignItems: 'center',
  },
  pdf: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 22,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleBox: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
  subtitle: {
    color: '#C9CCDA',
    fontSize: 12,
    fontFamily: FONTS.regular,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundFilled: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  dimmed: {
    opacity: 0.45,
  },
  zoomBar: {
    position: 'absolute',
    alignSelf: 'center',
    height: 56,
    paddingHorizontal: 8,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  percent: {
    minWidth: 58,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FONTS.semiBold,
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  pageLabel: {
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
});
