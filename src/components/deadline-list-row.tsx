import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { DateSquare } from '@/components/date-square';
import { StatusBadge } from '@/components/status-badge';
import { Text } from '@/components/text';
import { type Palette } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import type { DocumentListItem } from '@/db/types';
import { usePressed } from '@/hooks/use-pressed';
import { describeDistance } from '@/utils/dates';
import { daysUntil } from '@/utils/deadlines';
import { formatEuro } from '@/utils/money';
import { describeRepeat } from '@/utils/recurrence';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

export const DEADLINE_ROW_INSET = 74; // separators start after the date square (16 + 46 + 14 - 2)

type Props = {
  document: DocumentListItem & { expiresAt: string };
  near: boolean; // this week (or overdue): date square in the gradient, indigo subtitle with the distance
  onPress: () => void;
  onLongPress: () => void; // Modifica / Togli la scadenza…
};

// A row of the lists of Scadenze (docs/design/Scadenze.dc.html): 46 × 50 date square, name 16/600,
// a 13 line under it, chevron. This week: "€ 84,20 · tra 3 giorni" in indigo; later: what repeats
// ("Ogni 2 anni") or the note. The Da pagare / Pagata badge when the document has a status.
export function DeadlineListRow({ document, near, onPress, onLongPress }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { pressed, handlers } = usePressed();
  const days = daysUntil(document.expiresAt);
  const overdue = days < 0;
  const subtitle = rowSubtitle(document, days, near);

  return (
    <Pressable
      {...handlers}
      onPress={onPress}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onLongPress();
      }}
      delayLongPress={400}
      accessibilityRole="button"
      accessibilityLabel={[document.title, subtitle, statusLabel(document)].filter(Boolean).join(', ')}
      accessibilityHint="Tieni premuto per modificare o togliere la scadenza"
      style={[styles.row, pressed && styles.pressed]}>
      <DateSquare iso={document.expiresAt} highlighted={near && !overdue} />
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={2}>
          {document.title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.subtitle, near && styles.subtitleNear, overdue && styles.subtitleOverdue]}
            numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {document.paymentStatus && <StatusBadge status={document.paymentStatus} />}
      <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={15} weight="semibold" />
    </Pressable>
  );
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Near: amount and distance ("€ 84,20 · tra 3 giorni"). Later: amount, then what repeats
// ("Ogni 2 anni"), else the first line of the note, else the person or the category
function rowSubtitle(document: DocumentListItem, days: number, near: boolean): string {
  const amount = document.amountCents !== null ? formatEuro(document.amountCents) : null;
  if (near) return [amount, describeDistance(days)].filter(Boolean).join(' · ');
  const repeat = document.repeat ? capitalize(describeRepeat(document.repeat).replace('Si ripete ', '')) : null;
  const note = document.notes?.split('\n')[0].trim() || null;
  const fallback = document.personName ?? document.category.name;
  return [amount, repeat ?? note ?? fallback].filter(Boolean).join(' · ');
}

function statusLabel(document: DocumentListItem): string | null {
  if (document.paymentStatus === 'due') return 'da pagare';
  if (document.paymentStatus === 'paid') return 'pagata';
  return null;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pressed: {
    backgroundColor: c.backgroundSelected,
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  subtitleNear: {
    color: c.indigo,
  },
  subtitleOverdue: {
    color: c.error,
  },
});
