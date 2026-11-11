import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconSquare } from '@/components/icon-square';
import { Text } from '@/components/text';
import { BRAND_COLOR, DANGER_COLOR } from '@/constants/brand';
import { cardRowEdge } from '@/constants/theme';
import type { DocumentListItem } from '@/db/types';
import { usePressed } from '@/hooks/use-pressed';
import { useTheme } from '@/hooks/use-theme';
import { describeDistance, formatShortDate } from '@/utils/dates';
import { daysUntil } from '@/utils/deadlines';

const ICON = 28;
const INSET = 16 + ICON + 12; // separators start after the icon, like iOS lists

type Props = {
  document: DocumentListItem; // includes category and person name
  href: Href;
  cardColor: string; // background of the grouped block
  first: boolean; // first row of its section: rounded top corners
  last: boolean; // last row: rounded bottom corners
  highlighted?: boolean; // its day is selected in the week strip
};

// One row of an inset grouped list (iOS Settings style): 28 pt category icon, "Title · Person",
// the date on a footnote line (red when overdue), chevron. System font sizes, so Dynamic Type scales.
export function DeadlineRow({ document, href, cardColor, first, last, highlighted = false }: Props) {
  const theme = useTheme();
  const { pressed, handlers } = usePressed();
  const { category } = document;
  const days = document.expiresAt ? daysUntil(document.expiresAt) : null;
  const overdue = days !== null && days < 0;

  const background = pressed ? theme.backgroundSelected : highlighted ? `${BRAND_COLOR}24` : cardColor;

  return (
    <Pressable
      {...handlers}
      onPress={() => router.push(href)}
      accessibilityRole="button"
      style={[
        styles.row,
        { backgroundColor: background },
        cardRowEdge(first, last),
      ]}>
      <IconSquare symbol={category.symbol} colors={category.colors} size={ICON} />
      <View style={[styles.body, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.separator }]}>
        <View style={styles.texts}>
          <Text style={[styles.title, { color: theme.text }]}>
            {document.title}
            {document.personName ? <Text style={{ color: theme.textSecondary }}> · {document.personName}</Text> : null}
          </Text>
          {document.expiresAt && days !== null && (
            <Text style={[styles.date, { color: overdue ? DANGER_COLOR : theme.textSecondary }]}>
              {formatShortDate(document.expiresAt)} · {describeDistance(days)}
            </Text>
          )}
        </View>
        <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={13} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },
  // Text and chevron; its top hairline is the separator, so it starts after the icon
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: INSET - 16 - ICON,
    paddingVertical: 10,
    paddingRight: 16,
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: 17, // iOS body
    lineHeight: 22,
  },
  date: {
    fontSize: 13, // iOS footnote
    lineHeight: 18,
  },
});
