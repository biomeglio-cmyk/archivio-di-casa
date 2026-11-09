import { Link, router, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { confirmDeleteDocument } from '@/actions/delete-actions';
import { SwipeableRow } from '@/components/swipeable-row';
import { ThemedText } from '@/components/themed-text';
import type { DocumentListItem } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/utils/dates';
import { daysUntil } from '@/utils/deadlines';

type Props = {
  document: DocumentListItem; // includes its category
  // Each tab has its own copy of the document screen, so the caller decides where to go
  href: Href;
};

// A document in a list: category icon, title, expiry date.
// Swipe left or long-press for "Modifica" and "Elimina".
export function DocumentRow({ document, href }: Props) {
  const theme = useTheme();
  const db = useSQLiteContext();
  const { category } = document;

  const edit = () => router.push({ pathname: '/edit-document/[id]', params: { id: String(document.id) } });
  const remove = () => confirmDeleteDocument(db, document);

  return (
    <SwipeableRow onEdit={edit} onDelete={remove}>
      <Link href={href} asChild>
        <Link.Trigger>
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
              <ThemedText type="small" themeColor="textSecondary">
                {document.expiresAt
                  ? `${daysUntil(document.expiresAt) < 0 ? 'Scaduto il' : 'Scade il'} ${formatDate(document.expiresAt)}`
                  : 'Nessuna scadenza'}
              </ThemedText>
            </View>
            <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={14} />
          </Pressable>
        </Link.Trigger>
        {/* Native iOS context menu on long press */}
        <Link.Menu>
          <Link.MenuAction title="Modifica" icon="pencil" onPress={edit} />
          <Link.MenuAction title="Elimina" icon="trash" destructive onPress={remove} />
        </Link.Menu>
      </Link>
    </SwipeableRow>
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
