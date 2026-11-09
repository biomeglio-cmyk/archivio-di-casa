import { Link, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { confirmDeletePerson } from '@/actions/delete-actions';
import { SwipeableRow } from '@/components/swipeable-row';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR } from '@/constants/brand';
import type { Person } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  person: Person;
  documentCount: number;
};

// A family member in the list: avatar, name, number of documents.
// Swipe left or long-press for "Modifica" and "Elimina".
export function PersonRow({ person, documentCount }: Props) {
  const theme = useTheme();
  const db = useSQLiteContext();

  const edit = () => router.push({ pathname: '/person-form', params: { id: String(person.id) } });
  const remove = () => confirmDeletePerson(db, person);

  return (
    <SwipeableRow onEdit={edit} onDelete={remove}>
      <Link href={{ pathname: '/person/[id]', params: { id: String(person.id) } }} asChild>
        <Link.Trigger>
          <Pressable
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
            ]}>
            <SymbolView name="person.crop.circle" tintColor={BRAND_COLOR} size={40} />
            <View style={styles.texts}>
              <ThemedText>{person.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {documentCount === 1 ? '1 documento' : `${documentCount} documenti`}
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
  texts: {
    flex: 1,
  },
});
