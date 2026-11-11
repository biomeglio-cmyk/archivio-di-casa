import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import { FONTS } from '@/constants/typography';

type Props = {
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  enabled?: boolean;
};

const SEGMENT_HEIGHT = 38;
const INSET = 4;

// Choice between a few options (PDF/Foto, Foto/Colore…): 38-high segments inside a lilac pill,
// the chosen one a white pill with a shadow and indigo text
export function Segmented({ values, selectedIndex, onChange, enabled = true }: Props) {
  return (
    <View style={[styles.pill, !enabled && styles.disabled]} accessibilityRole="tablist">
      {values.map((value, index) => {
        const selected = index === selectedIndex;
        return (
          <Pressable
            key={`${index}-${value}`}
            onPress={() => !selected && onChange(index)}
            disabled={!enabled}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled: !enabled }}
            style={[styles.segment, selected && styles.selected]}>
            <Text
              style={[styles.label, selected ? styles.labelSelected : styles.labelIdle]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              maxFontSizeMultiplier={1.4}>
              {value}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    padding: INSET,
    borderRadius: Radius.pill,
    backgroundColor: Colors.light.lilac,
  },
  disabled: {
    opacity: 0.5,
  },
  segment: {
    flex: 1,
    minHeight: SEGMENT_HEIGHT,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  selected: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(28, 30, 70, 0.12)',
  },
  label: {
    fontSize: 15,
  },
  labelSelected: {
    color: Colors.light.indigo,
    fontFamily: FONTS.semiBold,
  },
  labelIdle: {
    color: Colors.light.textSecondary,
    fontFamily: FONTS.medium,
  },
});
