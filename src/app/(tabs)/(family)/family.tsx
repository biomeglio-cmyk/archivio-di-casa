import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PersonTile } from '@/components/person-tile';
import { TabHeader } from '@/components/tab-header';
import { TileGrid, TileScrollView } from '@/components/tile-grid';
import { listPeopleWithCounts } from '@/db/people';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';

// "/family": the shared tab header ("+" adds a person), then the people in the shared TileGrid
// and the dashed "Aggiungi persona"
export default function FamilyScreen() {
  const theme = useTheme();
  const { data: people } = useDbQuery(listPeopleWithCounts, []);
  const addPerson = () => router.push('/person-form');

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <TabHeader title="Famiglia" action={{ symbol: 'plus', accessibilityLabel: 'Aggiungi persona', onPress: addPerson }} />
      <TileScrollView>
        <TileGrid
          items={people}
          keyFor={(person) => person.id}
          add={{ label: 'Aggiungi persona', onPress: addPerson }}
          renderTile={(person, size) => <PersonTile person={person} size={size} />}
        />
      </TileScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
