import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientButton } from '@/components/gradient-button';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR, FONTS } from '@/constants/brand';
import { BUILTIN_CATEGORIES } from '@/db/builtin-categories';
import { useTheme } from '@/hooks/use-theme';
import { markOnboardingSeen } from '@/onboarding/onboarding-flag';

type Page = {
  title: string;
  text: string;
  illustration: { kind: 'logo' } | { kind: 'symbol'; symbol: SFSymbol; palette: number }; // index in the category palettes
};

const PAGES: Page[] = [
  {
    title: 'Benvenuto in sottomano',
    text: "Carte d'identità, tessere, bollette, garanzie: tutti i documenti di casa in un posto solo, sempre a portata di mano.",
    illustration: { kind: 'logo' },
  },
  {
    title: 'Fotografa una volta',
    text: 'Scatta fronte e retro con la cornice guida, oppure importa foto e PDF. Li ritrovi divisi per categoria e per persona.',
    illustration: { kind: 'symbol', symbol: 'camera.viewfinder', palette: 0 },
  },
  {
    title: 'Mai più scadenze dimenticate',
    text: 'Aggiungi la data di scadenza: la vedi in Scadenze e, se vuoi, nel Calendario dell’iPhone con un promemoria.',
    illustration: { kind: 'symbol', symbol: 'calendar.badge.clock', palette: 2 },
  },
  {
    title: 'Pronto da inviare',
    text: 'Crea un PDF o un’immagine leggera quanto serve e mandala con WhatsApp o Mail, oppure salvala in File.',
    illustration: { kind: 'symbol', symbol: 'paperplane', palette: 7 },
  },
];

// "Consigli iniziali": 4 pages swiped horizontally, dots, "Salta" at the top right,
// "Avanti" / "Inizia" at the bottom. Shown once at first launch, and again from Famiglia → Aiuto.
export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;

  function close() {
    markOnboardingSeen();
    router.back();
  }

  function next() {
    if (last) {
      close();
      return;
    }
    scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
    setPage(page + 1);
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.topBar}>
        {!last && (
          <Pressable onPress={close} hitSlop={12} accessibilityRole="button">
            <Text style={styles.skip}>Salta</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={styles.pager}>
        {PAGES.map((p) => (
          <View key={p.title} style={[styles.page, { width }]}>
            <Illustration page={p} />
            <ThemedText style={styles.title}>{p.title}</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.text}>
              {p.text}
            </ThemedText>
            {p.illustration.kind === 'logo' && (
              <View style={[styles.privacy, { backgroundColor: theme.backgroundElement }]}>
                <SymbolView name="lock.shield" tintColor={BRAND_COLOR} size={20} />
                <ThemedText type="small" style={styles.privacyText}>
                  Restano sul tuo telefono e funzionano anche senza internet
                </ThemedText>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {PAGES.map((p, index) => (
          <View
            key={p.title}
            style={[styles.dot, { backgroundColor: index === page ? BRAND_COLOR : theme.backgroundSelected }, index === page && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <GradientButton label={last ? 'Inizia' : 'Avanti'} onPress={next} />
      </View>
    </View>
  );
}

function Illustration({ page }: { page: Page }) {
  if (page.illustration.kind === 'logo') {
    return <Image source={require('@/assets/images/logo-icon.png')} style={styles.logo} contentFit="cover" />;
  }
  // SF Symbol on a pastel tile, in the colors of a category
  const colors = BUILTIN_CATEGORIES[page.illustration.palette].colors;
  return (
    <LinearGradient colors={[colors.top, colors.bottom]} style={styles.tile}>
      <SymbolView name={page.illustration.symbol} tintColor={colors.text} size={64} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    height: 44,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  skip: {
    color: BRAND_COLOR,
    fontSize: 17,
    fontFamily: FONTS.titleSemiBold,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  logo: {
    width: 128,
    height: 128,
    borderRadius: 30,
    borderCurve: 'continuous',
    marginBottom: 8,
  },
  tile: {
    width: 160,
    height: 160,
    borderRadius: 36,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
    fontFamily: FONTS.titleBold,
  },
  text: {
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  privacyText: {
    flexShrink: 1,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 22, // the current page is a short bar, like the iOS page control
  },
  footer: {
    paddingHorizontal: 24,
  },
});
