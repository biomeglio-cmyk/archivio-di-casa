// "Tema" of Impostazioni lives in the ThemeProvider (theme/theme-provider.tsx): read and change it
// with useThemeMode() (hooks/use-theme.ts). Switching re-renders in place, nothing is reloaded.
export { readThemeMode, type ThemeMode } from '@/constants/theme';
