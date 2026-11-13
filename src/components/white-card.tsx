import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { cardSurface } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// White card of the guide: white, corners 22, soft shadow. Rows inside it draw their own
// separators (#EEF0F5), inset after their icon (see Row in grouped-list.tsx).
export function WhiteCard({
  children,
  style,
  ...rest
}: ViewProps & { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View {...rest} style={[cardSurface(theme), style]}>
      {children}
    </View>
  );
}
