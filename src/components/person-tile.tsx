import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { PersonAvatar } from '@/components/person-avatar';
import { ThemedText } from '@/components/themed-text';
import { DANGER_COLOR } from '@/constants/brand';
import type { PersonWithCount } from '@/db/types';
import { usePressed } from '@/hooks/use-pressed';
import { useTheme } from '@/hooks/use-theme';
import type { TileSize } from '@/hooks/use-tile-size';

type Props = {
  person: PersonWithCount;
  size: TileSize; // width from the grid, minimum height (taller with large text)
};

// Family grid tile: big avatar in the middle, name, and "N documenti" or "N in scadenza" in red
export function PersonTile({ person, size }: Props) {
  const theme = useTheme();
  const { pressed, handlers } = usePressed();
  const expiring = person.expiringCount > 0;

  return (
    <Pressable
      {...handlers}
      onPress={() => router.push({ pathname: '/person/[id]', params: { id: String(person.id) } })}
      accessibilityRole="button"
      style={[
        size,
        styles.tile,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.surface },
      ]}>
      <PersonAvatar name={person.name} photoPath={person.photoPath} size={52} />
      <ThemedText numberOfLines={2} style={styles.name}>
        {person.name}
      </ThemedText>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={[styles.count, expiring && { color: DANGER_COLOR }]}>
        {expiring
          ? `${person.expiringCount} in scadenza`
          : person.documentCount === 1
            ? '1 documento'
            : `${person.documentCount} documenti`}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 12,
    borderRadius: 20,
    borderCurve: 'continuous',
  },
  name: {
    marginTop: 4,
    textAlign: 'center',
  },
  count: {
    textAlign: 'center',
  },
});
