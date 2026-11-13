import { Stack } from 'expo-router/stack';

import { PIN_COLOR } from '@/constants/brand';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  pinned: boolean;
  onToggle: () => void;
};

// Heart in the top-right corner of a document or card: filled red = in "Preferiti"
export function PinHeart({ pinned, onToggle }: Props) {
  const theme = useTheme();
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        icon={pinned ? 'heart.fill' : 'heart'}
        tintColor={PIN_COLOR(theme)}
        accessibilityLabel={pinned ? 'Togli dai preferiti' : 'Aggiungi ai preferiti'}
        onPress={onToggle}
      />
    </Stack.Toolbar>
  );
}
