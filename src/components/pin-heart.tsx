import { Stack } from 'expo-router/stack';

import { PIN_COLOR } from '@/constants/brand';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

type Props = {
  pinned: boolean;
  onToggle: () => void;
};

// Heart in the top-right corner of a document or card: filled red = in "Preferiti"
export function PinHeart({ pinned, onToggle }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        icon={pinned ? 'heart.fill' : 'heart'}
        tintColor={PIN_COLOR(theme)}
        accessibilityLabel={pinned ? t('pinHeart.unpin') : t('pinHeart.pin')}
        onPress={onToggle}
      />
    </Stack.Toolbar>
  );
}
