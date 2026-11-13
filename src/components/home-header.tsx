import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { LogoMark } from '@/components/logo-mark';
import { Text } from '@/components/text';
import { type Palette } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { usePressed } from '@/hooks/use-pressed';
import { useNotificationFeed } from '@/notifications/feed';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// Top of Home (docs/design/Main.dc.html): ≡ menu on the left; on the right the bell, with the
// number of unread notifications, which opens the Notifiche panel, and the logo.
export function HomeHeader() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { unread } = useNotificationFeed();
  const menu = usePressed();
  const bell = usePressed();
  const count = unread;

  return (
    <View style={styles.row}>
      <Pressable
        {...menu.handlers}
        onPress={() => router.push({ pathname: '/menu', params: { current: 'home' } })}
        accessibilityRole="button"
        accessibilityLabel="Menu"
        style={[styles.menu, menu.pressed && styles.pressed]}>
        <SymbolView name="line.3.horizontal" tintColor={theme.text} size={22} weight="medium" />
      </Pressable>
      <View style={styles.right}>
        <Pressable
          {...bell.handlers}
          onPress={() => router.push('/notifications')}
          accessibilityRole="button"
          accessibilityLabel={count > 0 ? `Notifiche, ${count} non lette` : 'Notifiche'}
          style={[styles.bell, bell.pressed && styles.pressed]}>
          <SymbolView name="bell" tintColor={theme.text} size={21} weight="medium" />
          {count > 0 && (
            <View style={styles.badge} accessibilityElementsHidden>
              <Text style={styles.badgeText} maxFontSizeMultiplier={1.2}>
                {count > 99 ? '99+' : String(count)}
              </Text>
            </View>
          )}
        </Pressable>
        <View style={styles.logo} accessible accessibilityRole="image" accessibilityLabel="Sottomano">
          <LogoMark size={44} radius={10} />
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menu: {
    width: 44,
    height: 44,
    marginLeft: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: c.badge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    lineHeight: 13,
    fontFamily: FONTS.bold,
    letterSpacing: 0,
  },
  logo: {
    borderRadius: 10,
    boxShadow: '0 6px 10px rgba(100, 90, 235, 0.28)',
  },
  pressed: {
    opacity: 0.6,
  },
});
