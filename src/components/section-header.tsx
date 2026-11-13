import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { type Palette } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { useThemedStyles } from '@/hooks/use-theme';

type Props = {
  title: string; // "Preferiti", "Scadenze", "Archivio" (shown in capitals)
  action?: { label: string; onPress: () => void; accessibilityLabel?: string }; // "Vedi tutto", "Riordina"
};

// Section title of Home: 13/400 grey capitals, and on the right a 10/600 blue capitals link
// (its touch area is 44 high even if the text is small)
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
          <Text style={styles.actionLabel} maxFontSizeMultiplier={1.6}>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase', // +0.1em letter spacing from the app Text
    color: c.textSecondary,
  },
  action: {
    paddingVertical: 2,
  },
  actionLabel: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
    textTransform: 'uppercase',
    color: c.accent,
  },
});
