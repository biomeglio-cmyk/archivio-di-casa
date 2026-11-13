import { Colors } from '@/constants/theme';

// The app colors of the theme chosen at start (Impostazioni › Aspetto › Tema; constants/theme.ts)
export function useTheme() {
  return Colors.current;
}
