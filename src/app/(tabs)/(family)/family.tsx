import { router } from 'expo-router';

import { PersonTile } from '@/components/person-tile';
import { TileGrid, TileScrollView } from '@/components/tile-grid';
import { listPeopleWithCounts } from '@/db/people';
import { useDbQuery } from '@/hooks/use-db-query';

// "/family": the people in the shared TileGrid, then the dashed "Aggiungi persona"
export default function FamilyScreen() {
  const { data: people } = useDbQuery(listPeopleWithCounts, []);

  return (
    <TileScrollView>
      <TileGrid
        items={people}
        keyFor={(person) => person.id}
        add={{ label: 'Aggiungi persona', onPress: () => router.push('/person-form') }}
        renderTile={(person, size) => <PersonTile person={person} size={size} />}
      />
    </TileScrollView>
  );
}
