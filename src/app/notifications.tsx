import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { announce } from '@/a11y/accessibility';
import { useI18n } from '@/i18n';
import { useFormat } from '@/i18n/use-format';
import { Text } from '@/components/text';
import { type Palette } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { isUnread, markAllRead, markRead, useNotificationFeed, type FeedItem } from '@/notifications/feed';
import { categoryShadowRgb, tileFrame, tileGradientPoints } from '@/utils/colors';
import { useThemedStyles } from '@/hooks/use-theme';

const UNREAD_DOT = '#4A5CF0'; // 4.8:1 on pale lilac, 3:1 on the dark one
const BELL_FROM_RIGHT = 100; // center of the bell in Home: margin 22 + logo 44 + gap 12 + half bell 22

// "Notifiche" (docs/design/Notifiche.dc.html): a panel over Home, opened by the bell, with a little
// arrow pointing at it. "Segna come lette", then OGGI and QUESTA SETTIMANA: unread ones on pale lilac
// with a blue dot, read ones on white; the time (today) or the day. "Impostazioni notifiche" at the end.
// Tap outside to close. VoiceOver: the whole screen is the modal (the dimmed backdrop is its "Chiudi"
// button), and the escape gesture (or the magic tap) closes it too.
export default function NotificationsPanel() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { items, read, now } = useNotificationFeed();
  const close = () => router.back();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const today = items.filter((item) => item.at >= startOfToday.getTime());
  const earlier = items.filter((item) => item.at < startOfToday.getTime());
  const top = insets.top + 8 + 44 + 18; // under the bell

  function readAll() {
    markAllRead();
    announce(t('a11y.notificationsPanel.allRead'));
  }

  function open(item: FeedItem) {
    markRead(item.id);
    router.back();
    router.push(item.href);
  }

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      style={styles.dim}
      accessibilityViewIsModal
      onAccessibilityEscape={close}
      onMagicTap={close}>
      {/* The dimmed backdrop: a tap outside closes; for VoiceOver the first element, "Chiudi le notifiche" */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel={t('notificationsPanel.close')}
      />
      <View style={[styles.panel, { top, maxHeight: height - top - insets.bottom - 24 }]}>
        <View style={styles.arrow} />
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">
            {t('notificationsPanel.title')}
          </Text>
          <Pressable onPress={readAll} accessibilityRole="button" hitSlop={14}>
            <Text style={styles.markAll}>{t('notificationsPanel.markAllRead')}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {items.length === 0 && <Text style={styles.empty}>{t('notificationsPanel.empty')}</Text>}
          {today.length > 0 && <Group title={t('notificationsPanel.today')} items={today} read={read} onOpen={open} withTime />}
          {earlier.length > 0 && <Group title={t('notificationsPanel.thisWeek')} items={earlier} read={read} onOpen={open} />}
          <Pressable
            onPress={() => {
              router.back();
              router.push('/settings');
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.settings, pressed && styles.pressed]}>
            <Text style={styles.settingsText}>{t('notificationsPanel.settings')}</Text>
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
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const fmt = useFormat();
  const { fontScale } = useWindowDimensions();
  const large = fontScale > 1.3;
  return (
    <>
      <Text style={styles.section} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.items}>
        {items.map((item) => {
          const unread = isUnread(item, read);
          const date = new Date(item.at);
          const when = withTime
            ? `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
            : fmt.weekdayName(date.getDay(), 'short');
          // VoiceOver: the whole weekday ("lunedì", not "lun")
          const spokenWhen = withTime ? when : fmt.weekdayName(date.getDay(), 'long');
          return (
            <Pressable
              key={item.id}
              onPress={() => onOpen(item)}
              accessibilityRole="button"
              accessibilityLabel={[
                unread ? t('notificationsPanel.unreadItem', { title: item.title, body: item.body }) : `${item.title}, ${item.body}`,
                spokenWhen,
              ].join(', ')}
              style={({ pressed }) => [styles.item, unread && styles.itemUnread, pressed && styles.pressed]}>
              <LinearGradient
                colors={[item.colors.top, item.colors.bottom]}
                {...tileGradientPoints(item.colors)}
                style={[styles.icon, { boxShadow: `0 5px 10px rgba(${categoryShadowRgb(item.colors)}, 0.22)` }, tileFrame(item.colors)]}>
                <SymbolView name={item.symbol} tintColor={item.colors.text} size={19} />
              </LinearGradient>
              <View style={styles.texts}>
                <View style={[styles.line, large && styles.lineWrap]}>
                  <Text style={styles.itemTitle} numberOfLines={large ? undefined : 1}>
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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  dim: {
    flex: 1,
    backgroundColor: c.isDark ? c.scrim : 'rgba(28, 30, 70, 0.28)', // night: black 55 %
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
    backgroundColor: c.surface,
    boxShadow: '0 20px 50px rgba(28, 30, 70, 0.25)',
  },
  arrow: {
    position: 'absolute',
    top: -7,
    right: BELL_FROM_RIGHT - 14 - 8,
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: c.surface,
    transform: [{ rotate: '45deg' }],
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap', // larger text: "Segna come lette" goes under the title
    rowGap: 8,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: c.text,
  },
  markAll: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    textTransform: 'uppercase',
    color: c.accent,
  },
  content: {
    paddingBottom: 2,
  },
  empty: {
    marginTop: 16,
    marginHorizontal: 8,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 8,
    fontSize: 12,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: c.textSecondary,
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
    backgroundColor: c.surface,
  },
  itemUnread: {
    backgroundColor: c.paleLilac,
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
  lineWrap: {
    flexWrap: 'wrap', // larger text: the time goes under a long title
  },
  itemTitle: {
    flexShrink: 1,
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  when: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONTS.regular,
    color: c.textOnLilac,
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
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: c.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsText: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: c.indigo,
  },
});
