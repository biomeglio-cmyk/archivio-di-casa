import type { NativeStackNavigationOptions } from 'expo-router/native-stack';

import { FONTS } from '@/constants/brand';

// Shared options for the Stack inside each tab: large titles in Outfit
export const TAB_STACK_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  headerLargeTitleEnabled: true,
  headerLargeTitleStyle: { fontFamily: FONTS.titleBold },
  headerTitleStyle: { fontFamily: FONTS.titleSemiBold },
};
