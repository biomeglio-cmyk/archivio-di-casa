import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { PersonAvatar } from '@/components/person-avatar';
import { ThemedText } from '@/components/themed-text';
import type { Person } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  person: Person;
  documentCount: number;
};

// A family member, on one line: photo or initial | name + documents | chevron.
// Editing and deleting happen from the person screen (pencil at the top right), like in Contacts.
export function PersonRow({ person, documentCount }: Props) {
  const theme = useTheme();

  return (
    <Link href={{ pathname: '/person/[id]', params: { id: String(person.id) } }} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
        ]}>
        <PersonAvatar name={person.name} photoPath={person.photoPath} size={40} />
        <View style={styles.texts}>
          <ThemedText numberOfLines={1}>{person.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {documentCount === 1 ? '1 documento' : `${documentCount} documenti`}
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
  texts: {
    flex: 1,
  },
});
