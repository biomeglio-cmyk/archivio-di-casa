import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { BRAND_GRADIENT, GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { Colors } from '@/constants/theme';

type Props = {
  share: number; // 0…1
  height?: number; // 6 on the purple cards, 10 in Sblocca
  onGradient?: boolean; // on a purple card: white bar on translucent white
  accessibilityLabel?: string;
  max?: number; // VoiceOver: "5 of 7"
  now?: number;
};

// The "N di 7" bar of the free version
export function ProgressBar({ share, height = 6, onGradient = false, accessibilityLabel, max, now }: Props) {
  const width = `${Math.round(Math.min(1, Math.max(0, share)) * 100)}%` as const;
  return (
    <View
      accessible={accessibilityLabel !== undefined}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={max !== undefined ? { min: 0, max, now } : undefined}
      style={[
        styles.track,
        { height, borderRadius: height / 2 },
        { backgroundColor: onGradient ? 'rgba(255, 255, 255, 0.3)' : Colors.light.lilac },
      ]}>
      {onGradient ? (
        <View style={[styles.fill, { width, borderRadius: height / 2, backgroundColor: '#FFFFFF' }]} />
      ) : (
        <LinearGradient
          colors={BRAND_GRADIENT}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={[styles.fill, { width, borderRadius: height / 2 }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
