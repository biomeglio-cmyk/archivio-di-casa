import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { accessibilityActionsOf, runAccessibilityAction, type QuickAction } from '@/actions/quick-actions';
import type { TileRect } from '@/components/quick-action-menu';

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
  // Long press (~400 ms): light vibration, then the quick-action menu anchored to the tile.
  // People have no order to drag, so here a long press always opens the menu.
  actions?: QuickAction[];
  onLongPress?: (rect: TileRect) => void;
};

const LONG_PRESS_MS = 400; // the same delay as the drag of the other grids

// Family grid tile: big avatar in the middle, name, and "N documenti" or "N in scadenza" in red
export function PersonTile({ person, size, actions = [], onLongPress }: Props) {
  const theme = useTheme();
  const { pressed, handlers } = usePressed();
  const expiring = person.expiringCount > 0;
  const ref = useRef<ComponentRef<typeof View>>(null);
  const open = () => router.push({ pathname: '/person/[id]', params: { id: String(person.id) } });

  function longPress() {
    if (!onLongPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    ref.current?.measureInWindow((x, y, width, height) => onLongPress({ x, y, width, height }));
  }

  return (
    <Pressable
      ref={ref}
      {...handlers}
      onPress={open}
      onLongPress={onLongPress ? longPress : undefined}
      delayLongPress={LONG_PRESS_MS}
      accessibilityRole="button"
      accessibilityActions={[{ name: 'activate' }, ...accessibilityActionsOf(actions)]}
      onAccessibilityAction={(event) => {
        if (!runAccessibilityAction(actions, event.nativeEvent.actionName)) open();
      }}
      style={[size, styles.tile, { backgroundColor: pressed ? theme.backgroundSelected : theme.surface }]}>
      <PersonAvatar name={person.name} photoPath={person.photoPath} size={52} />
      <ThemedText numberOfLines={2} style={styles.name}>
        {person.name}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={[styles.count, expiring && { color: DANGER_COLOR }]}>
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
