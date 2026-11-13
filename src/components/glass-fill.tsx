import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

// Background of menus and sheets: in Tema notte the glass of the design (#242644 78 % → #16172C
// 62 %), drawn behind the content; by day nothing (they keep their white surface). The container
// sets `glassStyle(theme)` (transparent background + the white 10 % border) and overflow hidden.
export function GlassFill() {
  const theme = useTheme();
  if (!theme.glass) return null;
  return (
    <LinearGradient
      colors={[theme.glass.top, theme.glass.bottom]}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
