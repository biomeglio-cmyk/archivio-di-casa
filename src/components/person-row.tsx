import { Link, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, StyleSheet, View } from 'react-native';

import { confirmDeletePerson } from '@/actions/delete-actions';
import { PersonAvatar } from '@/components/person-avatar';
import { RowIconButton } from '@/components/row-icon-button';
import { ThemedText } from '@/components/themed-text';
import type { Person } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  person: Person;
  documentCount: number;
};

// A family member, on one line: avatar | name + documents | pencil, bin.
// Tapping the left part opens the person; long-pressing it shows the same actions in a menu.
export function PersonRow({ person, documentCount }: Props) {
  const theme = useTheme();
  const db = useSQLiteContext();

  const edit = () => router.push({ pathname: '/person-form', params: { id: String(person.id) } });
  const remove = () => confirmDeletePerson(db, person);

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <Link href={{ pathname: '/person/[id]', params: { id: String(person.id) } }} asChild>
        <Link.Trigger>
          {/* Static style here: the horizontal layout lives in the inner View */}
          <Pressable style={styles.main} accessibilityRole="link">
            <View style={styles.content}>
              <PersonAvatar name={person.name} photoPath={person.photoPath} size={40} />
              <View style={styles.texts}>
                <ThemedText numberOfLines={1}>{person.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {documentCount === 1 ? '1 documento' : `${documentCount} documenti`}
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

      <RowIconButton symbol="pencil" label={`Modifica ${person.name}`} onPress={edit} />
      <RowIconButton symbol="trash" label={`Elimina ${person.name}`} onPress={remove} />
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
  texts: {
    flex: 1,
  },
});
