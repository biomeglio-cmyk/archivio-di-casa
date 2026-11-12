import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { Colors } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { isUnread, markAllRead, markRead, useNotificationFeed, type FeedItem } from '@/notifications/feed';
import { categoryShadowRgb } from '@/utils/colors';

const WEEKDAYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const UNREAD_DOT = '#4A5CF0';
const BELL_FROM_RIGHT = 100; // center of the bell in Home: margin 22 + logo 44 + gap 12 + half bell 22

// "Notifiche" (docs/design/Notifiche.dc.html): a panel over Home, opened by the bell, with a little
// arrow pointing at it. "Segna come lette", then OGGI and QUESTA SETTIMANA: unread ones on pale lilac
// with a blue dot, read ones on white; the time (today) or the day. "Impostazioni notifiche" at the end.
// Tap outside to close.
export default function NotificationsPanel() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { items, read, now } = useNotificationFeed();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const today = items.filter((item) => item.at >= startOfToday.getTime());
  const earlier = items.filter((item) => item.at < startOfToday.getTime());
  const top = insets.top + 8 + 44 + 18; // under the bell

  function open(item: FeedItem) {
    markRead(item.id);
    router.back();
    router.push(item.href);
  }

  return (
    <Animated.View entering={FadeIn.duration(150)} style={styles.dim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Chiudi le notifiche" />
      <View style={[styles.panel, { top, maxHeight: height - top - insets.bottom - 24 }]} accessibilityViewIsModal>
        <View style={styles.arrow} />
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">
            Notifiche
          </Text>
          <Pressable onPress={markAllRead} accessibilityRole="button" hitSlop={14}>
            <Text style={styles.markAll}>Segna come lette</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {items.length === 0 && <Text style={styles.empty}>Nessuna notifica negli ultimi 7 giorni.</Text>}
          {today.length > 0 && <Group title="Oggi" items={today} read={read} onOpen={open} withTime />}
          {earlier.length > 0 && <Group title="Questa settimana" items={earlier} read={read} onOpen={open} />}
          <Pressable
            onPress={() => {
              router.back();
              router.push('/settings');
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.settings, pressed && styles.pressed]}>
            <Text style={styles.settingsText}>Impostazioni notifiche</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Animated.View>
  );
}

type GroupProps = {
  title: string;
  items: FeedItem[];
  read: Parameters<typeof isUnread>[1];
  onOpen: (item: FeedItem) => void;
  withTime?: boolean; // "9:00" today, "lun" before
};

function Group({ title, items, read, onOpen, withTime = false }: GroupProps) {
  return (
    <>
      <Text style={styles.section}>{title}</Text>
      <View style={styles.items}>
        {items.map((item) => {
          const unread = isUnread(item, read);
          const date = new Date(item.at);
          const when = withTime
            ? `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
            : WEEKDAYS[date.getDay()];
          return (
            <Pressable
              key={item.id}
              onPress={() => onOpen(item)}
              accessibilityRole="button"
              accessibilityLabel={`${unread ? 'Non letta. ' : ''}${item.title}, ${item.body}`}
              style={({ pressed }) => [styles.item, unread && styles.itemUnread, pressed && styles.pressed]}>
              <LinearGradient
                colors={[item.colors.top, item.colors.bottom]}
                start={GRADIENT_START}
                end={GRADIENT_END}
                style={[styles.icon, { boxShadow: `0 5px 10px rgba(${categoryShadowRgb(item.colors)}, 0.22)` }]}>
                <SymbolView name={item.symbol} tintColor={item.colors.text} size={19} />
              </LinearGradient>
              <View style={styles.texts}>
                <View style={styles.line}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.when}>{when}</Text>
                </View>
                <Text style={styles.body}>{item.body}</Text>
              </View>
              <View style={[styles.dot, unread && styles.dotOn]} />
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dim: {
    flex: 1,
    backgroundColor: 'rgba(28, 30, 70, 0.28)',
  },
  panel: {
    position: 'absolute',
    left: 14,
    right: 14,
    paddingTop: 18,
    paddingHorizontal: 12,
    paddingBottom: 14,
    borderRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 20px 50px rgba(28, 30, 70, 0.25)',
  },
  arrow: {
    position: 'absolute',
    top: -7,
    right: BELL_FROM_RIGHT - 14 - 8,
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: Colors.light.text,
  },
  markAll: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
    textTransform: 'uppercase',
    color: Colors.light.accent,
  },
  content: {
    paddingBottom: 2,
  },
  empty: {
    marginTop: 16,
    marginHorizontal: 8,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 8,
    fontSize: 12,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: Colors.light.textSecondary,
  },
  items: {
    gap: 4,
  },
  item: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
  },
  itemUnread: {
    backgroundColor: Colors.light.paleLilac,
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemTitle: {
    flexShrink: 1,
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: Colors.light.text,
  },
  when: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONTS.regular,
    color: Colors.light.textOnLilac,
  },
  dot: {
    width: 9,
    height: 9,
    marginTop: 6,
    borderRadius: 5,
  },
  dotOn: {
    backgroundColor: UNREAD_DOT,
  },
  settings: {
    marginTop: 10,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: Colors.light.indigo,
  },
});
