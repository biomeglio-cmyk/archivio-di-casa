import Constants from 'expo-constants';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SUPPORT_EMAIL, writeToSupport } from '@/actions/contact';
import { rateApp, recommendApp } from '@/actions/app-actions';
import { isBackupDue } from '@/backup/backup-layout';
import { addByScan, addFromFiles, addFromPhotos } from '@/capture/add-actions';
import { FreeUsageCard } from '@/components/free-usage-card';
import { GlassFill } from '@/components/glass-fill';
import { LogoMark } from '@/components/logo-mark';
import { Text } from '@/components/text';
import type { MenuSection } from '@/constants/navigation';
import { type Palette } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { getMenuCounts } from '@/db/menu-counts';
import { useDbQuery } from '@/hooks/use-db-query';
import { useLargeText } from '@/hooks/use-large-text';
import { usePressed } from '@/hooks/use-pressed';
import { useI18n } from '@/i18n';
import { whenBelowLimit } from '@/settings/free-limit';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const OPEN_MS = 260;
const CLOSE_MS = 200;
const PANEL_SHARE = 0.79; // 308 of 390 in the design
const PANEL_MAX = 340;
// "Backup da fare": an orange "!" (not just a dot), 3:1 on the white and on the dark panel
const BACKUP_DUE = (p: Palette) => (p.isDark ? '#F5824A' : '#D9622B');

// Side menu (docs/design/Menu.dc.html), opened by ≡ in Home (and the menu button of the other
// tabs). It slides in from the left over the dimmed screen; a tap outside, ✕, a swipe to the
// left or the VoiceOver escape gesture close it. The header and the version stay fixed, the
// list scrolls when it is longer than the screen.
// Entries of the design first (purple free-version card → Sblocca; Home, Preferiti, Scadenze,
// Famiglia, Tessere; Impostazioni, Backup, Aiuto e contatti, Valuta Sottomano, Consiglialo a un
// amico), then our extras: Cestino, Password, Scansiona, Dalle foto,
// Importa file.
// Rows: a tab → close, then go there; another screen → the menu is REPLACED by it (closing that
// screen brings back to where you were); "Aggiungi" rows keep the menu open while the scanner or
// the picker is up (a cancel leaves you in the menu).
export default function MenuScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const { current } = useLocalSearchParams<{ current?: MenuSection }>();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const width = Math.min(PANEL_MAX, Math.round(screenWidth * PANEL_SHARE));

  const { data: counts } = useDbQuery(getMenuCounts, []);
  const [backupDue] = useState(() => isBackupDue(Date.now()));

  // 0 = closed (off screen on the left), 1 = open; `drag` follows a swipe to the left (≤ 0)
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  const closing = useSharedValue(false); // set once, when it starts sliding out
  useEffect(() => {
    progress.set(withTiming(1, { duration: OPEN_MS }));
  }, [progress]);

  const dimStyle = useAnimatedStyle(() => ({ opacity: progress.get() * (1 + drag.get() / width) }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (progress.get() - 1) * width + drag.get() }],
  }));

  // Slides out, then does `after` (by default: back to the screen below)
  function close(after: () => void = () => router.back()) {
    if (closing.get()) return; // a second tap while sliding out does nothing
    closing.set(true);
    progress.set(withTiming(0, { duration: CLOSE_MS }));
    setTimeout(after, CLOSE_MS);
  }

  // Swipe to the left on the panel: it follows the finger; far or fast enough → closes
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, g) => g.dx < -10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_, g) => drag.set(Math.min(0, g.dx)),
        onPanResponderRelease: (_, g) => {
          if (g.dx < -width * 0.3 || g.vx < -0.5) {
            close(() => router.back());
          } else {
            drag.set(withTiming(0, { duration: 150 }));
          }
        },
        onPanResponderTerminate: () => drag.set(withTiming(0, { duration: 150 })),
      }),
    // close only reads shared values and the router
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, drag],
  );

  const goToTab = (href: Href) =>
    close(() => {
      router.back();
      router.navigate(href);
    });
  const openScreen = (href: Href) => close(() => router.replace(href));

  const cardsId = counts?.cardsCategoryId;
  const passwordId = counts?.passwordCategoryId;
  const urgent = counts?.urgent ?? 0;
  const trash = counts?.trash ?? 0;
  const version = Constants.expoConfig?.version ?? '1.0';

  return (
    // VoiceOver: the whole screen is the modal (nothing of the screen below is reachable); the
    // backdrop is hidden, ✕ and the escape gesture close
    <View style={styles.screen} accessibilityViewIsModal onAccessibilityEscape={() => close()} onMagicTap={() => close()}>
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.dim, dimStyle]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} />
      </Animated.View>

      <Animated.View
        {...swipe.panHandlers}
        style={[
          styles.panel,
          { width, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
          panelStyle,
        ]}>
        {/* Tema notte: the glass of the design (#242644 78 % → #16172C 62 %) over the dimmed page */}
        <GlassFill />
        <View style={styles.header}>
          <View style={styles.logo} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <LogoMark size={42} radius={9} />
          </View>
          <Text style={styles.brand} accessibilityRole="header" numberOfLines={1}>
            {'Sottomano' /* i18n-ignore */}
          </Text>
          <Pressable
            onPress={() => close()}
            accessibilityRole="button"
            accessibilityLabel={t('menu.close')}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
            <SymbolView name="xmark" tintColor={theme.text} size={18} weight="semibold" />
          </Pressable>
        </View>

        <View style={styles.freeCard}>
          <FreeUsageCard variant="menu" onOpen={() => openScreen('/unlock')} />
        </View>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          <MenuItem label={t('menu.home')} symbol="house" active={current === 'home'} onPress={() => goToTab('/')} />
          <MenuItem
            label={t('menu.favorites')}
            symbol="heart"
            active={current === 'favorites'}
            onPress={() => goToTab('/favorites')}
          />
          <MenuItem
            label={t('menu.deadlines')}
            symbol="calendar"
            active={current === 'deadlines'}
            accessibilityLabel={urgent > 0 ? t('menu.deadlinesUrgent', { number: urgent }) : t('menu.deadlines')}
            onPress={() => goToTab('/deadlines')}
            trailing={urgent > 0 ? <Badge count={urgent} /> : null}
          />
          <MenuItem label={t('menu.family')} symbol="person.2" active={current === 'family'} onPress={() => goToTab('/family')} />
          {cardsId != null && (
            <MenuItem
              label={t('menu.cards')}
              symbol="creditcard"
              active={current === 'cards'}
              onPress={() => goToTab({ pathname: '/category/[id]', params: { id: String(cardsId) } })}
            />
          )}

          <Divider />
          <MenuItem label={t('common.settings')} symbol="gearshape" onPress={() => openScreen('/settings')} />
          <MenuItem
            label={t('menu.backup')}
            symbol="icloud.and.arrow.up"
            accessibilityLabel={backupDue ? t('menu.backupDue') : t('menu.backup')}
            onPress={() => openScreen('/backup')}
            trailing={backupDue ? <SymbolView name="exclamationmark.circle.fill" tintColor={BACKUP_DUE(theme)} size={18} /> : null}
          />
          <MenuItem label={t('menu.help')} symbol="questionmark.circle" onPress={() => openScreen('/onboarding')} />
          <MenuItem
            label={t('contact.writeUs')}
            symbol="envelope"
            accessibilityHint={SUPPORT_EMAIL}
            onPress={() => close(() => void writeToSupport())}
          />
          <MenuItem label={t('menu.rate')} symbol="star" onPress={rateApp} />
          <MenuItem label={t('menu.recommend')} symbol="square.and.arrow.up" onPress={recommendApp} />

          {/* Our extras, after the entries of the design */}
          <Divider />
          <MenuItem
            label={t('menu.trash')}
            symbol="trash"
            accessibilityLabel={trash > 0 ? t('menu.trashCount', { number: trash }) : t('menu.trash')}
            onPress={() => openScreen('/trash')}
            trailing={trash > 0 ? <Value text={String(trash)} /> : null}
          />
          {passwordId != null && (
            <MenuItem
              label={t('menu.password')}
              symbol="key"
              onPress={() => goToTab({ pathname: '/category/[id]', params: { id: String(passwordId) } })}
            />
          )}
          <MenuItem label={t('menu.scan')} symbol="doc.viewfinder" onPress={() => whenBelowLimit(addByScan)} />
          <MenuItem label={t('menu.fromPhotos')} symbol="photo.on.rectangle" onPress={() => whenBelowLimit(addFromPhotos)} />
          <MenuItem label={t('menu.importFiles')} symbol="doc" onPress={() => whenBelowLimit(addFromFiles)} />
        </ScrollView>

        <Text style={styles.version}>{t('menu.version', { version })}</Text>
      </Animated.View>
    </View>
  );
}

type ItemProps = {
  label: string;
  symbol: SFSymbol;
  onPress: () => void;
  active?: boolean; // the screen the menu was opened from: lilac pill, indigo text
  trailing?: ReactNode; // badge, dot, value or switch on the right
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

// One row: 50 high, icon 22, label 16/500 (600 indigo on lilac when it is the current screen)
function MenuItem({ label, symbol, onPress, active = false, trailing, accessibilityLabel, accessibilityHint }: ItemProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { pressed, handlers } = usePressed();
  const color = active ? theme.indigo : theme.text;
  const iconColor = active ? theme.indigo : theme.menuIcon;
  const large = useLargeText(); // the icon above the label
  return (
    <Pressable
      {...handlers}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={active ? { selected: true } : undefined}
      style={[styles.item, large && styles.itemLarge, active && styles.itemActive, pressed && !active && styles.itemPressed]}>
      <SymbolView name={symbol} tintColor={iconColor} size={22} />
      <Text style={[styles.itemLabel, large && styles.itemLabelLarge, { color }, active && styles.itemLabelActive]}>{label}</Text>
      {trailing}
    </Pressable>
  );
}

function Badge({ count }: { count: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText} maxFontSizeMultiplier={2}>
        {count > 99 ? '99+' : String(count)}
      </Text>
    </View>
  );
}

function Value({ text }: { text: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Text style={styles.value} numberOfLines={1}>
      {text}
    </Text>
  );
}

function Divider() {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.divider} />;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
  },
  dim: {
    backgroundColor: c.scrim,
  },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    paddingHorizontal: 16,
    backgroundColor: c.glass ? 'transparent' : c.surface,
    ...(c.glass && { borderRightWidth: 1, borderRightColor: c.glass.border }),
    borderTopRightRadius: 32,
    borderBottomRightRadius: 32,
    borderCurve: 'continuous',
    boxShadow: '12px 0 40px rgba(28, 30, 70, 0.18)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 6,
  },
  logo: {
    borderRadius: 9,
    boxShadow: '0 6px 10px rgba(100, 90, 235, 0.28)',
  },
  brand: {
    flex: 1,
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: c.text,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  freeCard: {
    marginTop: 20,
  },
  list: {
    flex: 1,
    marginTop: 18,
  },
  listContent: {
    gap: 2,
    paddingBottom: 16,
  },
  item: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  itemActive: {
    backgroundColor: c.menuActive,
  },
  itemPressed: {
    backgroundColor: c.paleLilac,
  },
  itemLarge: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
    paddingVertical: 10,
  },
  itemLabelLarge: {
    flex: 0,
    alignSelf: 'stretch',
  },
  itemLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.medium,
  },
  itemLabelActive: {
    fontFamily: FONTS.semiBold,
  },
  badge: {
    minWidth: 22,
    minHeight: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: c.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 14,
    fontFamily: FONTS.bold,
    letterSpacing: 0,
  },
  value: {
    flexShrink: 1,
    maxWidth: '45%',
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  divider: {
    height: 1,
    marginVertical: 14,
    marginHorizontal: 8,
    backgroundColor: c.separator,
  },
  version: {
    paddingHorizontal: 14,
    paddingTop: 8,
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
});
