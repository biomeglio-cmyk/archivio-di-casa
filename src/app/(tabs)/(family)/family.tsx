import { router } from 'expo-router';
import { FlatList } from 'react-native';

import { DashedAddTile } from '@/components/dashed-add-tile';
import { PersonTile } from '@/components/person-tile';
import { listPeopleWithCounts } from '@/db/people';
import type { PersonWithCount } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { TILE_COLUMNS, tileGridStyles, useTileSize } from '@/hooks/use-tile-size';

// The grid items: every person, then the dashed "Aggiungi persona" tile
type GridItem = { kind: 'person'; person: PersonWithCount } | { kind: 'add' };

// "/family": two-column grid of people, same sizing rules as Archivio
export default function FamilyScreen() {
  const size = useTileSize();
  const { data: people } = useDbQuery(listPeopleWithCounts, []);

  // "Aggiungi persona" appears together with the people, so it doesn't flash alone while loading
  const items: GridItem[] = people
    ? [...people.map((person) => ({ kind: 'person' as const, person })), { kind: 'add' }]
    : [];

  return (
    <FlatList
      data={items}
      numColumns={TILE_COLUMNS}
      keyExtractor={(item) => (item.kind === 'person' ? String(item.person.id) : 'add')}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={tileGridStyles.content}
      columnWrapperStyle={tileGridStyles.row}
      renderItem={({ item }) =>
        item.kind === 'person' ? (
          <PersonTile person={item.person} size={size} />
        ) : (
          <DashedAddTile label="Aggiungi persona" size={size} onPress={() => router.push('/person-form')} />
        )
      }
    />
  );
}
