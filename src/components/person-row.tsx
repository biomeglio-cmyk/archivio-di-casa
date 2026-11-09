import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR } from '@/constants/brand';
import type { Person } from '@/data/people';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  person: Person;
  documentCount: number;
};

// A family member in the list: avatar, name, number of documents
export function PersonRow({ person, documentCount }: Props) {
  const theme = useTheme();

  return (
    <Link href={{ pathname: '/person/[id]', params: { id: person.id } }} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
        ]}>
        <SymbolView name={person.symbol} tintColor={BRAND_COLOR} size={40} />
        <View style={styles.texts}>
          <ThemedText>{person.name}</ThemedText>
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
