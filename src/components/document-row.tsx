import { Link, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DANGER_COLOR } from '@/constants/brand';
import type { DocumentListItem } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { describeDistance, formatShortDate } from '@/utils/dates';
import { daysUntil } from '@/utils/deadlines';

type Props = {
  document: DocumentListItem; // includes its category
  // Each tab has its own copy of the document screen, so the caller decides where to go
  href: Href;
};

// A document in a list, on one line: category icon | title + expiry | chevron.
// Editing and deleting happen from the detail (pencil at the top right), like in Contacts.
export function DocumentRow({ document, href }: Props) {
  const theme = useTheme();
  const { category } = document;
  const days = document.expiresAt ? daysUntil(document.expiresAt) : null;
  const expired = days !== null && days < 0;

  return (
    <Link href={href} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
        ]}>
        <View style={[styles.icon, { backgroundColor: category.colors.bottom }]}>
          <SymbolView name={category.symbol} tintColor={category.colors.text} size={20} />
        </View>
        <View style={styles.texts}>
          <ThemedText numberOfLines={1}>{document.title}</ThemedText>
          {/* "lun 9 nov · oggi", "gio 12 nov · tra 3 giorni"; expired dates in red */}
          <ThemedText
            type="small"
            themeColor="textSecondary"
            numberOfLines={1}
            style={expired && { color: DANGER_COLOR }}>
            {document.expiresAt && days !== null
              ? `${formatShortDate(document.expiresAt)} · ${describeDistance(days)}`
              : 'Nessuna scadenza'}
          </ThemedText>
        </View>
        <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={14} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
  },
});
