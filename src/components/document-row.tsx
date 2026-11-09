import { Link, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getCategory } from '@/constants/categories';
import type { FamilyDocument } from '@/data/documents';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/utils/dates';

type Props = {
  document: FamilyDocument;
  // Each tab has its own copy of the document screen, so the caller decides where to go
  href: Href;
};

// A document in a list: category icon, title, expiry date
export function DocumentRow({ document, href }: Props) {
  const theme = useTheme();
  const category = getCategory(document.categoryId);

  return (
    <Link href={href} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
        ]}>
        <View style={[styles.icon, { backgroundColor: category?.colors.bottom }]}>
          <SymbolView
            name={category?.symbol ?? 'doc'}
            tintColor={category?.colors.text ?? theme.text}
            size={20}
          />
        </View>
        <View style={styles.texts}>
          <ThemedText numberOfLines={1}>{document.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {document.expiresAt ? `Scade il ${formatDate(document.expiresAt)}` : 'Nessuna scadenza'}
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
