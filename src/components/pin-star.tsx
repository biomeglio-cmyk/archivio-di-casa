import { Stack } from 'expo-router/stack';

import { PIN_COLOR } from '@/constants/brand';

type Props = {
  pinned: boolean;
  onToggle: () => void;
};

// Star in the top-right corner of a document or card: filled orange = in "Sottomano"
export function PinStar({ pinned, onToggle }: Props) {
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        icon={pinned ? 'star.fill' : 'star'}
        tintColor={PIN_COLOR}
        accessibilityLabel={pinned ? 'Togli da Sottomano' : 'Tieni sottomano'}
        onPress={onToggle}
      />
    </Stack.Toolbar>
  );
}
