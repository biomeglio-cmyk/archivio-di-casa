import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

// Background of the side menu, the quick menu and the action sheets: in Tema notte the glass of the
// design (#242644 94 % → #16172C 92 % over a strong blur, intensity 80), drawn behind the content;
// by day nothing (they keep their white surface). The container sets a transparent background,
// the white 10 % border and overflow hidden; the 55 % black scrim stays behind.
export function GlassFill() {
  const theme = useTheme();
  if (!theme.glass) return null;
  return (
    <>
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
      <LinearGradient
        colors={[theme.glass.top, theme.glass.bottom]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </>
  );
}
