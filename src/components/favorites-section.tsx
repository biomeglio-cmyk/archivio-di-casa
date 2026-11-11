import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BRAND_COLOR } from '@/constants/brand';
import { useTheme } from '@/hooks/use-theme';

// Small grey uppercase title of a section of Home ("PREFERITI", "CATEGORIE"),
// with an optional link on the right
export function SectionHeader({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  const theme = useTheme();
  return (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: theme.textSecondary }]} accessibilityRole="header">
        {title}
      </Text>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={10} accessibilityRole="button">
          <Text style={styles.headerAction}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 13,
    lineHeight: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  headerAction: {
    color: BRAND_COLOR,
    fontSize: 17,
  },
});
