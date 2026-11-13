import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  // "panel": the side menu, denser (#242644 94 % → #16172C 92 %) over a strong blur (intensity 80);
  // "sheet" (default): quick menu and action sheets (#242644 78 % → #16172C 62 %)
  variant?: 'panel' | 'sheet';
};

// Background of menus and sheets: in Tema notte the glass of the design, drawn behind the content;
// by day nothing (they keep their white surface). The container sets a transparent background,
// the white 10 % border and overflow hidden.
export function GlassFill({ variant = 'sheet' }: Props) {
  const theme = useTheme();
  if (!theme.glass) return null;
  const panel = variant === 'panel';
  return (
    <>
      {panel && <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />}
      <LinearGradient
        colors={panel ? [theme.glass.panelTop, theme.glass.panelBottom] : [theme.glass.top, theme.glass.bottom]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </>
  );
}
