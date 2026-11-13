import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { SecondaryButton } from '@/components/secondary-button';
import { PIN_COLOR } from '@/constants/brand';
import { type Palette } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

// The heart color at 14%: "Nei preferiti" stands out from lilac
const PIN_TINT = (p: Palette) => `${PIN_COLOR(p)}24`;

type Props = {
  onAdd: (() => void) | null; // null = the button is not shown
  onEdit: (() => void) | null;
  onDelete: (() => void) | null; // the caller shows the confirmation alert
  pin?: { pinned: boolean; onToggle: () => void }; // "Aggiungi ai preferiti" / "Nei preferiti"
  onRenew?: (() => void) | null; // "Rinnovato": documents with a deadline
};

// Buttons at the end of the detail screens: "Aggiungi pagine" (main gradient pill),
// "Aggiungi ai preferiti" and "Rinnovato" (lilac pills), then "Modifica" and "Cancella" always
// side by side, at any text size (one line each, shrinking a little instead of wrapping).
// They sit in the scroll content, right after the data, and scroll with the page.
export function DetailActionBar({ onAdd, onEdit, onDelete, pin, onRenew }: Props) {
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const theme = useTheme();

  if (!onAdd && !onEdit && !onDelete && !pin) return null;

  return (
    <View style={styles.container}>
      {onAdd && <PrimaryButton label={t('detailActionBar.addPages')} symbol="plus" onPress={onAdd} singleLine />}
      {pin && (
        <SecondaryButton
          label={pin.pinned ? t('detailActionBar.pinned') : t('detailActionBar.pin')}
          symbol={pin.pinned ? 'heart.fill' : 'heart'}
          symbolColor={PIN_COLOR(theme)}
          onPress={pin.onToggle}
          background={pin.pinned ? PIN_TINT(theme) : theme.lilac}
          color={theme.text}
          selected={pin.pinned}
          singleLine
        />
      )}
      {onRenew && (
        <SecondaryButton label={t('detailActionBar.renewed')} symbol="arrow.clockwise" onPress={onRenew} color={theme.text} singleLine />
      )}
      {(onEdit || onDelete) && (
        <View style={styles.row}>
          {onEdit && (
            <SecondaryButton
              label={t('common.edit')}
              symbol="pencil"
              onPress={onEdit}
              color={theme.text}
              singleLine
              style={styles.half}
            />
          )}
          {onDelete && (
            <SecondaryButton
              label={t('detailActionBar.delete')}
              symbol="trash"
              onPress={onDelete}
              background={theme.errorBackground}
              color={theme.error}
              singleLine
              style={styles.half}
            />
          )}
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    flexDirection: 'row', // Modifica and Cancella always side by side
    gap: 10,
  },
  half: {
    flex: 1, // two equal halves of the row
    paddingHorizontal: 12,
  },
});
