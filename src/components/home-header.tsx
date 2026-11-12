import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { LogoMark } from '@/components/logo-mark';
import { Text } from '@/components/text';
import { Colors } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { countUrgentDeadlines } from '@/db/urgent-count';
import { useDbQuery } from '@/hooks/use-db-query';
import { usePressed } from '@/hooks/use-pressed';

// Top of Home (docs/design/Main.dc.html): ≡ menu on the left (our Menu sheet for now); on the
// right the bell with the badge of the Scadenze tab (it opens Scadenze until the Notifiche
// screen exists) and the logo.
export function HomeHeader() {
  const { data: urgent } = useDbQuery(countUrgentDeadlines, []);
  const menu = usePressed();
  const bell = usePressed();
  const count = urgent ?? 0;

  return (
    <View style={styles.row}>
      <Pressable
        {...menu.handlers}
        onPress={() => router.push('/menu')}
        accessibilityRole="button"
        accessibilityLabel="Menu"
        style={[styles.menu, menu.pressed && styles.pressed]}>
        <SymbolView name="line.3.horizontal" tintColor={Colors.light.text} size={22} weight="medium" />
      </Pressable>
      <View style={styles.right}>
        <Pressable
          {...bell.handlers}
          onPress={() => router.navigate('/(tabs)/(deadlines)/deadlines')}
          accessibilityRole="button"
          accessibilityLabel={count > 0 ? `Scadenze, ${count} da controllare` : 'Scadenze'}
          style={[styles.bell, bell.pressed && styles.pressed]}>
          <SymbolView name="bell" tintColor={Colors.light.text} size={21} weight="medium" />
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

const styles = StyleSheet.create({
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
    backgroundColor: Colors.light.lilac,
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
    backgroundColor: Colors.light.badge,
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
