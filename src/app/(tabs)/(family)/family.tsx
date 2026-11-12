import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { personQuickActions } from '@/actions/quick-actions';
import { PersonTile } from '@/components/person-tile';
import { QuickActionMenu, type QuickMenuTarget } from '@/components/quick-action-menu';
import { TabHeader } from '@/components/tab-header';
import { TileGrid, TileScrollView } from '@/components/tile-grid';
import { listPeopleWithCounts } from '@/db/people';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';

// "/family": the shared tab header ("+" adds a person), then the people in the shared TileGrid
// and the dashed "Aggiungi persona". Long press on a person: Apri, Modifica, Elimina
export default function FamilyScreen() {
  const theme = useTheme();
  const { data: people } = useDbQuery(listPeopleWithCounts, []);
  const addPerson = () => router.push('/person-form');
  const db = useSQLiteContext();
  const [menu, setMenu] = useState<QuickMenuTarget | null>(null); // long press on a person

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <TabHeader section="family"
        title="Famiglia"
        action={{ symbol: 'plus', accessibilityLabel: 'Aggiungi persona', onPress: addPerson }}
      />
      <TileScrollView>
        <TileGrid
          items={people}
          keyFor={(person) => person.id}
          add={{ label: 'Aggiungi persona', onPress: addPerson }}
          renderTile={(person, size) => {
            const actions = personQuickActions(db, person);
            return (
              <PersonTile
                person={person}
                size={size}
                actions={actions}
                onLongPress={(rect) =>
                  setMenu({
                    rect,
                    tile: <PersonTile person={person} size={{ width: rect.width, minHeight: rect.height }} />,
                    actions,
                  })
                }
              />
            );
          }}
        />
      </TileScrollView>
      <QuickActionMenu target={menu} onClose={() => setMenu(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
