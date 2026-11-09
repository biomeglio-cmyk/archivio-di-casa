import { Link, router, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { confirmDeleteDocument } from '@/actions/delete-actions';
import { RowIconButton } from '@/components/row-icon-button';
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

// A document in a list, on one line: category icon | title + expiry | pencil, bin.
// Tapping the left part opens the detail; long-pressing it shows the same actions in a menu.
export function DocumentRow({ document, href }: Props) {
  const theme = useTheme();
  const db = useSQLiteContext();
  const { category } = document;

  const edit = () => router.push({ pathname: '/edit-document/[id]', params: { id: String(document.id) } });
  const remove = () => confirmDeleteDocument(db, document);

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <Link href={href} asChild>
        <Link.Trigger>
          {/* Static style here: the horizontal layout lives in the inner View */}
          <Pressable style={styles.main} accessibilityRole="link">
            <View style={styles.content}>
              <View style={[styles.icon, { backgroundColor: category.colors.bottom }]}>
                <SymbolView name={category.symbol} tintColor={category.colors.text} size={20} />
              </View>
              <View style={styles.texts}>
                <ThemedText numberOfLines={1}>{document.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {document.expiresAt
                    ? `${daysUntil(document.expiresAt) < 0 ? 'Scaduto il' : 'Scade il'} ${formatDate(document.expiresAt)}`
                    : 'Nessuna scadenza'}
                </ThemedText>
              </View>
            </View>
          </Pressable>
        </Link.Trigger>
        {/* Native iOS context menu on long press */}
        <Link.Menu>
          <Link.MenuAction title="Modifica" icon="pencil" onPress={edit} />
          <Link.MenuAction title="Elimina" icon="trash" destructive onPress={remove} />
        </Link.Menu>
      </Link>

      <RowIconButton symbol="pencil" label={`Modifica ${document.title}`} onPress={edit} />
      <RowIconButton symbol="trash" label={`Elimina ${document.title}`} onPress={remove} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  main: {
    flex: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 12,
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
