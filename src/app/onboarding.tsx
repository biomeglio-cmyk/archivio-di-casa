import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/logo-mark';
import { PrimaryButton } from '@/components/primary-button';
import { Text } from '@/components/text';
import { BRAND_GRADIENT, GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { Colors } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { markOnboardingSeen } from '@/onboarding/onboarding-flag';

const ART_WIDTH = 338; // the illustration box of the design (390 - 2 × 26)
const ART_HEIGHT = 380;
const SIDE = 26;

type Page = { title: string; text: string; art: () => ReactNode; info?: string };

const PAGES: Page[] = [
  {
    title: 'Benvenuto in Sottomano',
    text: "Carte d'identità, tessere, bollette, garanzie: tutti i documenti di casa in un posto solo, sempre a portata di mano.",
    art: WelcomeArt,
    info: 'Restano sul tuo telefono e funzionano anche senza internet',
  },
  {
    title: 'Fotografa una volta',
    text: 'Scansiona anche più pagine o importa foto e PDF. Li ritrovi in ordine e li invii leggeri quanto serve.',
    art: ScanArt,
  },
  {
    title: 'Alle scadenze pensiamo noi',
    text: 'Ti avvisiamo prima che scada una bolletta o un documento. Se vuoi, anche nel Calendario.',
    art: DeadlineArt,
  },
  {
    title: 'Le tessere sempre in tasca',
    text: 'Fotografa le tue tessere: alla cassa mostri il codice a barre o il QR con un tocco.',
    art: CardsArt,
  },
];

// "Benvenuto" 1–4 (docs/design/Benvenuto*.dc.html), first launch only (and again from Aiuto):
// "Salta" at the top right (not on the last page), the illustration, the title and the text, the
// page dots, "Avanti" / "Inizia". Swiping works too. Our extra: "Ripristina da un backup" for who
// already has one (it opens Backup and its file picker).
export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;
  const scale = Math.min(1, (width - SIDE * 2) / ART_WIDTH);

  function close() {
    markOnboardingSeen();
    router.back();
  }

  function restore() {
    markOnboardingSeen();
    router.replace({ pathname: '/backup', params: { action: 'restore' } });
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
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.topBar}>
        {!last && (
          <Pressable onPress={close} hitSlop={12} accessibilityRole="button" style={styles.skipButton}>
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
        {PAGES.map((p, index) => (
          <ScrollView key={p.title} style={{ width }} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
            <View style={{ height: ART_HEIGHT * scale, alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View style={[styles.art, { transform: [{ scale }], marginTop: (ART_HEIGHT * (scale - 1)) / 2 }]}>{p.art()}</View>
            </View>
            <Text style={[styles.title, index === 0 && styles.titleFirst]} accessibilityRole="header">
              {p.title}
            </Text>
            <Text style={styles.text}>{p.text}</Text>
            {p.info && (
              <View style={styles.info}>
                <SymbolView name="lock.shield" tintColor={Colors.light.indigo} size={22} />
                <Text style={styles.infoText}>{p.info}</Text>
              </View>
            )}
            <View style={styles.dots} accessible accessibilityLabel={`Pagina ${index + 1} di ${PAGES.length}`}>
              {PAGES.map((other, dot) => (
                <View key={other.title} style={[styles.dot, dot === index && styles.dotActive]} />
              ))}
            </View>
          </ScrollView>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label={last ? 'Inizia' : 'Avanti'} onPress={next} />
        {(page === 0 || last) && (
          <Pressable onPress={restore} accessibilityRole="button" hitSlop={8} style={styles.restore}>
            <Text style={styles.restoreText}>Ripristina da un backup</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ——— Illustrations (338 × 380, scaled to the screen) ———

function Circle({ color }: { color: string }) {
  return <View style={[styles.circle, { backgroundColor: color }]} />;
}

// A gradient shape: the outer view carries place, size, rotation and shadow; the gradient is drawn
// in a clip with the same corner radius (overflow hidden), so on iOS it is always rounded, also
// next to a shadow
function Gradient({ colors, style, children }: { colors: readonly [string, string]; style: object; children?: ReactNode }) {
  const flat = StyleSheet.flatten(style) as { borderRadius?: number };
  const clip = { borderRadius: flat.borderRadius ?? 0 };
  return (
    <View style={style}>
      <View style={[StyleSheet.absoluteFill, styles.clip, clip]} pointerEvents="none">
        <LinearGradient colors={colors} start={GRADIENT_START} end={GRADIENT_END} style={StyleSheet.absoluteFill} />
      </View>
      {children}
    </View>
  );
}

function MiniTile({ name, symbol, colors, shadow, left, top, rotate }: {
  name: string;
  symbol: SFSymbol;
  colors: readonly [string, string];
  shadow: string;
  left: number;
  top: number;
  rotate: string;
}) {
  return (
    // Outer view: place, rotation and colored shadow; inner view: the rounded clip of the gradient
    <View style={[styles.miniTile, { left, top, transform: [{ rotate }], boxShadow: `0 14px 26px rgba(${shadow}, 0.28)` }]}>
      <View style={styles.miniTileClip}>
        <Gradient colors={colors} style={StyleSheet.absoluteFill} />
        <SymbolView name={symbol} tintColor="#FFFFFF" size={24} />
        <Text style={styles.miniTileName}>{name}</Text>
      </View>
    </View>
  );
}

function WelcomeArt() {
  return (
    <>
      <Circle color={Colors.light.lilac} />
      <MiniTile name="Bollette" symbol="bolt" colors={['#FFA36E', '#F5824A']} shadow="245, 130, 74" left={28} top={46} rotate="-8deg" />
      <MiniTile name="Tessere" symbol="creditcard" colors={['#6FD3AE', '#45B68E']} shadow="69, 182, 142" left={182} top={24} rotate="7deg" />
      <MiniTile name="Salute" symbol="heart" colors={['#F79BBA', '#EE7499']} shadow="238, 116, 153" left={196} top={214} rotate="-6deg" />
      <MiniTile name="Auto" symbol="car" colors={['#86B4F7', '#6494EE']} shadow="100, 148, 238" left={38} top={232} rotate="5deg" />
      <View style={styles.centerLogo}>
        <LogoMark size={88} radius={22} />
      </View>
      <View style={styles.bubble}>
        <SymbolView name="wifi.slash" tintColor={Colors.light.indigo} size={20} />
      </View>
    </>
  );
}

function Paper({ left, top, rotate, accent, shadow, highlight = false }: {
  left: number;
  top: number;
  rotate: string;
  accent: string;
  shadow: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.paper, { left, top, transform: [{ rotate }], boxShadow: shadow }]}>
      <View style={[styles.bar, { width: 50, height: 9, backgroundColor: accent }]} />
      <View style={[styles.bar, { width: 96, backgroundColor: '#E6E8F0' }]} />
      <View style={[styles.bar, { width: 80, backgroundColor: '#E6E8F0' }]} />
      {highlight && (
        <View style={styles.amountBox}>
          <View style={[styles.bar, { width: 40, height: 5, backgroundColor: '#FFC9A8' }]} />
          <View style={[styles.bar, { width: 64, height: 10, backgroundColor: '#F5824A' }]} />
        </View>
      )}
      <View style={[styles.bar, { width: 104, backgroundColor: '#EEF0F5' }]} />
      {!highlight && <View style={[styles.bar, { width: 70, backgroundColor: '#EEF0F5' }]} />}
    </View>
  );
}

function ScanArt() {
  return (
    <>
      <Circle color={Colors.light.lilac} />
      <Paper left={92} top={70} rotate="-8deg" accent="#6FD3AE" shadow="0 12px 26px rgba(28, 30, 70, 0.12)" />
      <Paper left={124} top={86} rotate="4deg" accent="#FFA36E" shadow="0 14px 30px rgba(28, 30, 70, 0.16)" highlight />
      <View style={styles.scanFrame} />
      <Gradient colors={BRAND_GRADIENT} style={styles.cameraBadge}>
        <SymbolView name="camera" tintColor="#FFFFFF" size={26} />
      </Gradient>
      <View style={styles.pdfPill}>
        <Gradient colors={['#F79BBA', '#EE7499']} style={styles.pdfIcon}>
          <SymbolView name="doc.fill" tintColor="#FFFFFF" size={14} />
        </Gradient>
        <View>
          <Text style={styles.pdfTitle}>PDF pronto</Text>
          <Text style={styles.pdfSize}>980 KB</Text>
        </View>
      </View>
    </>
  );
}

function DeadlineArt() {
  const days = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
  return (
    <>
      <Circle color="#FFF0E7" />
      <View style={styles.miniCalendar}>
        <View style={styles.calendarHead}>
          <Text style={styles.calendarMonth}>Novembre</Text>
          <Text style={styles.calendarYear}>2026</Text>
        </View>
        <View style={styles.calendarGrid}>
          {days.map((day) =>
            day === 14 ? (
              <Gradient key={day} colors={BRAND_GRADIENT} style={styles.calendarDay}>
                <Text style={[styles.calendarNumber, styles.calendarChosen]}>{day}</Text>
              </Gradient>
            ) : (
              <View key={day} style={styles.calendarDay}>
                <Text style={styles.calendarNumber}>{day}</Text>
              </View>
            ),
          )}
        </View>
      </View>
      <View style={styles.reminder}>
        <Gradient colors={['#FFA36E', '#F5824A']} style={styles.reminderIcon}>
          <SymbolView name="bolt" tintColor="#FFFFFF" size={18} />
        </Gradient>
        <View>
          <Text style={styles.reminderTitle}>Bolletta luce</Text>
          <Text style={styles.reminderText}>Scade tra 2 giorni</Text>
        </View>
      </View>
      <Gradient colors={BRAND_GRADIENT} style={styles.bellBadge}>
        <SymbolView name="bell" tintColor="#FFFFFF" size={24} />
        <View style={styles.redDot} />
      </Gradient>
    </>
  );
}

function WalletCard({ name, colors, accent, left, top, rotate }: {
  name: string;
  colors: readonly [string, string];
  accent: string;
  left: number;
  top: number;
  rotate: string;
}) {
  return (
    // Outer view: place, rotation and shadow; inner view: the rounded clip of gradient and circles
    <View style={[styles.wallet, { left, top, transform: [{ rotate }] }]}>
      <View style={styles.walletClip}>
        <Gradient colors={colors} style={StyleSheet.absoluteFill} />
        <View style={styles.walletCircleTop} />
        <View style={[styles.walletCircleBottom, { backgroundColor: accent }]} />
        <Text style={styles.walletName}>{name}</Text>
        <View style={styles.walletCode}>
          {Array.from({ length: 34 }, (_, i) => (
            <View key={i} style={[styles.walletBar, { width: i % 3 === 0 ? 3 : 2 }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

function CardsArt() {
  return (
    <>
      <Circle color="#E6F7F0" />
      <WalletCard name="Palestra" colors={['#FF6F9B', '#E8457A']} accent="#FFD27A" left={40} top={60} rotate="-10deg" />
      <WalletCard name="Biblioteca" colors={BRAND_GRADIENT} accent="#FF9A70" left={70} top={120} rotate="-2deg" />
      <WalletCard name="Supermercato" colors={['#2ECC9A', '#13A37B']} accent="#F5CB6B" left={96} top={186} rotate="7deg" />
      <Gradient colors={BRAND_GRADIENT} style={styles.scanBadge}>
        <SymbolView name="barcode.viewfinder" tintColor="#FFFFFF" size={26} />
      </Gradient>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  topBar: {
    height: 44,
    paddingHorizontal: SIDE,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  skipButton: {
    height: 44,
    justifyContent: 'center',
  },
  skip: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: Colors.light.textSecondary,
  },
  pager: {
    flex: 1,
  },
  page: {
    paddingHorizontal: SIDE,
    paddingTop: 4,
    paddingBottom: 12,
  },
  art: {
    width: ART_WIDTH,
    height: ART_HEIGHT,
  },
  title: {
    marginTop: 18,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONTS.bold,
    color: Colors.light.text,
  },
  titleFirst: {
    fontSize: 27,
    lineHeight: 33,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
  },
  info: {
    marginTop: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: Colors.light.paleLilac,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONTS.medium,
    color: Colors.light.text,
  },
  dots: {
    marginTop: 22,
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.switchOff,
  },
  dotActive: {
    width: 22,
    backgroundColor: Colors.light.indigo,
  },
  footer: {
    paddingHorizontal: SIDE,
    paddingTop: 12,
  },
  restore: {
    marginTop: 12,
    alignSelf: 'center',
    minHeight: 32,
    justifyContent: 'center',
  },
  restoreText: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: Colors.light.accent,
  },
  // Illustrations
  clip: {
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  circle: {
    position: 'absolute',
    left: ART_WIDTH / 2 - 150,
    top: ART_HEIGHT / 2 - 150,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  miniTile: {
    position: 'absolute',
    width: 132,
    height: 112,
    borderRadius: 24,
    borderCurve: 'continuous',
  },
  miniTileClip: {
    flex: 1,
    padding: 14,
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  miniTileName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FONTS.semiBold,
  },
  centerLogo: {
    position: 'absolute',
    left: ART_WIDTH / 2 - 44,
    top: ART_HEIGHT / 2 - 44,
    borderRadius: 22,
    boxShadow: '0 14px 28px rgba(100, 90, 235, 0.35)',
  },
  bubble: {
    position: 'absolute',
    right: 22,
    top: 168,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 18px rgba(28, 30, 70, 0.12)',
  },
  paper: {
    position: 'absolute',
    width: 150,
    height: 196,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  bar: {
    height: 6,
    borderRadius: 3,
  },
  amountBox: {
    marginTop: 6,
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FFF0E7',
    gap: 5,
  },
  scanFrame: {
    position: 'absolute',
    left: 108,
    top: 72,
    width: 182,
    height: 226,
    borderWidth: 3,
    borderColor: '#8B6CF0',
    borderRadius: 16,
    transform: [{ rotate: '4deg' }],
  },
  cameraBadge: {
    position: 'absolute',
    left: 44,
    top: 226,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 20px rgba(100, 90, 235, 0.35)',
  },
  pdfPill: {
    position: 'absolute',
    right: 30,
    top: 54,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 10px 22px rgba(28, 30, 70, 0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pdfIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfTitle: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: Colors.light.text,
  },
  pdfSize: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: Colors.light.textSecondary,
  },
  miniCalendar: {
    position: 'absolute',
    left: ART_WIDTH / 2 - 120,
    top: 70,
    width: 240,
    padding: 16,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 16px 34px rgba(28, 30, 70, 0.14)',
  },
  calendarHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calendarMonth: {
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: Colors.light.text,
  },
  calendarYear: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: Colors.light.textSecondary,
  },
  calendarGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 6,
  },
  calendarDay: {
    width: 26,
    height: 26,
    marginHorizontal: (208 / 7 - 26) / 2,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarNumber: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: Colors.light.textOnLilac,
  },
  calendarChosen: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
  reminder: {
    position: 'absolute',
    left: 34,
    top: 236,
    width: 230,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    boxShadow: '0 14px 30px rgba(28, 30, 70, 0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reminderIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderTitle: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    color: Colors.light.text,
  },
  reminderText: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: Colors.light.textSecondary,
  },
  bellBadge: {
    position: 'absolute',
    right: 26,
    top: 40,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 20px rgba(100, 90, 235, 0.35)',
  },
  redDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: Colors.light.badge,
  },
  wallet: {
    position: 'absolute',
    width: 230,
    height: 144,
    borderRadius: 16,
    borderCurve: 'continuous',
    boxShadow: '0 14px 28px rgba(28, 30, 70, 0.14)',
  },
  walletClip: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  walletCircleTop: {
    position: 'absolute',
    right: -30,
    top: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  walletCircleBottom: {
    position: 'absolute',
    right: 30,
    bottom: -50,
    width: 90,
    height: 90,
    borderRadius: 45,
    opacity: 0.85,
  },
  walletName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  walletCode: {
    marginTop: 'auto',
    height: 30,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    gap: 2,
    overflow: 'hidden',
  },
  walletBar: {
    height: '100%',
    backgroundColor: Colors.light.text,
  },
  scanBadge: {
    position: 'absolute',
    left: 30,
    top: 252,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 20px rgba(100, 90, 235, 0.35)',
  },
});
