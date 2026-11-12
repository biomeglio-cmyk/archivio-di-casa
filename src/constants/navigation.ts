import type { NativeStackNavigationOptions } from 'expo-router/native-stack';

import { FONTS } from '@/constants/typography';

// Shared options for the Stack inside each tab: large titles in Onest
export const TAB_STACK_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  headerLargeTitleEnabled: true,
  headerLargeTitleStyle: { fontFamily: FONTS.bold },
  headerTitleStyle: { fontFamily: FONTS.semiBold },
};

// The screen the side menu was opened from: its entry is highlighted (src/app/menu.tsx)
export type MenuSection = 'home' | 'favorites' | 'deadlines' | 'family' | 'cards';
