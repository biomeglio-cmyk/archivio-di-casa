import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { type Palette } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { useThemedStyles } from '@/hooks/use-theme';

type Props = {
  title: string; // "Preferiti", "Scadenze", "Archivio" (shown in capitals)
  action?: { label: string; onPress: () => void; accessibilityLabel?: string }; // "Vedi tutto", "Riordina"
};

// Section title of Home: 13/400 grey capitals, and on the right a 12/600 blue capitals link
// (its touch area is 44 high even if the text is small). With larger text the link goes under
// the title when both don't fit.
export function SectionHeader({ title, action }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {action && (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          hitSlop={{ top: 16, bottom: 16, left: 12, right: 12 }}
          style={styles.action}>
          <Text style={styles.actionLabel} maxFontSizeMultiplier={2}>
            {action.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 12,
    rowGap: 4,
  },
  title: {
    flexShrink: 1,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase', // +0.1em letter spacing from the app Text
    color: c.textSecondary,
  },
  action: {
    paddingVertical: 2,
  },
  actionLabel: {
    fontSize: 15, // Riordina / Vedi tutto: 15 like every text button
    fontFamily: FONTS.semiBold,
    textTransform: 'uppercase',
    color: c.accent,
  },
});
