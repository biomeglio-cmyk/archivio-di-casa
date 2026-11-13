import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { Text } from '@/components/text';
import { FONTS } from '@/constants/typography';
import { getDocumentDetail, listDocumentFiles } from '@/db/documents';
import type { DocumentFile } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { getDocumentsDirectory, resolveDocumentFile } from '@/storage/document-files';

const BACKGROUND = '#1A1C30';
const SIDE_MARGIN = 30; // equal margins left and right of a page at 100% (design: 330 of 390)
const PAGE_GAP = 18;
const ZOOM_MIN = 1;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.25;
const A4_RATIO = 210 / 297;

// "Visualizza" (docs/design/Visualizza.dc.html): the pages one under the other on a dark
// background; on top ✕, the name with "N pagine · scorri in basso" and Invia; at the bottom the
// zoom (100–200%) and "Pag. X di N". At 100% every page fits between the bars, centered; the pages
// are stacked and centered. Pinch or the buttons zoom around the center (the iOS scroll view zoom).
// A PDF is drawn by iOS (WKWebView) in the same centered frame: its pages scroll inside it.
export default function ViewDocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = Number(id);
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { data: document } = useDbQuery((db) => getDocumentDetail(db, documentId), [documentId]);
  const { data: files } = useDbQuery((db) => listDocumentFiles(db, documentId), [documentId]);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [zoom, setZoom] = useState(1);
  const [ratios, setRatios] = useState<Record<number, number>>({}); // width / height of each photo
  const [page, setPage] = useState(1);
  // Where the visible area is, in content points at zoom 1 (for the zoom buttons and "Pag. X")
  const view = useRef({ x: 0, y: 0, zoom: 1 });

  const pdf = files?.find((f) => f.kind === 'pdf') ?? null;
  const images = (files ?? []).filter((f) => f.kind === 'image');
  const pageCount = pdf ? null : images.length;
  const topBar = insets.top + 76;
  const bottomBar = insets.bottom + 30 + 56 + 16; // the zoom bar and a little room above it

  // At 100% a page fits the free area: the screen width minus equal margins, and never taller
  // than the space between the top bar and the zoom bar; always centered
  const maxWidth = screenWidth - SIDE_MARGIN * 2;
  const maxHeight = screenHeight - topBar - bottomBar;
  const fit = (ratio: number) => {
    const width = Math.min(maxWidth, maxHeight * ratio);
    return { width, height: width / ratio };
  };
  const sizes = images.map((file) => fit(ratios[file.id] ?? A4_RATIO));

  const subtitle = pdf
    ? 'PDF · scorri in basso'
    : pageCount === 1
      ? '1 pagina'
      : `${pageCount ?? 0} pagine · scorri in basso`;

  // Scroll or pinch: remember the visible area; the page is the one under the middle of the screen
  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, zoomScale } = event.nativeEvent;
    const scale = zoomScale || 1;
    view.current = { x: contentOffset.x, y: contentOffset.y, zoom: scale };
    if (Math.abs(scale - zoom) > 0.01) setZoom(scale);
    if (!pageCount) return;
    const middle = (contentOffset.y + screenHeight / 2) / scale;
    let top = topBar;
    for (let index = 0; index < sizes.length; index++) {
      top += sizes[index].height + PAGE_GAP;
      if (middle < top) {
        setPage(index + 1);
        return;
      }
    }
    setPage(sizes.length);
  }

  // The zoom buttons: zoom around the center of what is on screen
  function zoomTo(target: number) {
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, target));
    const { x, y, zoom: current } = view.current;
    const centerX = (x + screenWidth / 2) / current;
    const centerY = (y + screenHeight / 2) / current;
    const width = screenWidth / next;
    const height = screenHeight / next;
    scrollRef.current?.scrollResponderZoomTo({ x: centerX - width / 2, y: centerY - height / 2, width, height, animated: true });
    setZoom(next);
  }

  const send = () => router.push({ pathname: '/send', params: { ids: String(documentId) } });

  return (
    <View style={styles.screen}>
      {/* Dark screen: light clock and battery in both themes */}
      <StatusBar style="light" />
      <ScrollView
        ref={scrollRef}
        style={StyleSheet.absoluteFill}
        minimumZoomScale={ZOOM_MIN}
        maximumZoomScale={ZOOM_MAX}
        pinchGestureEnabled
        bouncesZoom
        centerContent
        contentInsetAdjustmentBehavior="never"
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}>
        <View style={[styles.pages, { width: screenWidth, paddingTop: topBar, paddingBottom: bottomBar }]}>
          {pdf ? (
            <PdfPage file={pdf} width={maxWidth} height={maxHeight} />
          ) : (
            images.map((file, index) => (
              <Image
                key={file.id}
                source={{ uri: resolveDocumentFile(file.path).uri }}
                onLoad={(event) => {
                  const { width, height } = event.source;
                  if (width > 0 && height > 0) setRatios((current) => ({ ...current, [file.id]: width / height }));
                }}
                style={[styles.page, sizes[index]]}
                contentFit="contain"
                accessibilityLabel={`Pagina ${index + 1} di ${images.length}`}
              />
            ))
          )}
          {files && !pdf && images.length === 0 && <Text style={styles.empty}>Questo documento non ha pagine.</Text>}
        </View>
      </ScrollView>

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
          disabled={zoom <= ZOOM_MIN + 0.01}
          onPress={() => zoomTo(zoom - ZOOM_STEP)}
        />
        <Text style={styles.percent} accessibilityLiveRegion="polite">
          {Math.round(zoom * 100)}%
        </Text>
        <RoundButton
          symbol="plus"
          label="Ingrandisci"
          transparent
          disabled={zoom >= ZOOM_MAX - 0.01}
          onPress={() => zoomTo(zoom + ZOOM_STEP)}
        />
        <View style={styles.divider} />
        <Text style={styles.pageLabel}>{pageCount ? `Pag. ${page} di ${pageCount}` : 'PDF'}</Text>
      </View>
    </View>
  );
}

// WKWebView draws the PDF; it may only read files inside our documents folder
function PdfPage({ file, width, height }: { file: DocumentFile; width: number; height: number }) {
  return (
    <WebView
      source={{ uri: resolveDocumentFile(file.path).uri }}
      originWhitelist={['*']}
      allowingReadAccessToURL={getDocumentsDirectory().uri}
      style={styles.pdf}
      containerStyle={[styles.pdfContainer, { width, height }]}
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
  pdf: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  pdfContainer: {
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
