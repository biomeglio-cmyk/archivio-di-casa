import { Colors } from '@/constants/theme';

// The app colors. Sottomano is drawn in light mode only (app.json "userInterfaceStyle": "light"
// and Appearance.setColorScheme('light') in the root layout), even when the iPhone is in dark mode.
export function useTheme() {
  return Colors.light;
}
