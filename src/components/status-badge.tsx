import { StyleSheet } from 'react-native';

import { Text } from '@/components/text';
import { Colors, themedStyles } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import type { PaymentStatus } from '@/db/types';

// "Da pagare" (#B42318 on #FDECEC) / "Pagata" (#0B6B4F on #E3F6EE), as in the design
export function StatusBadge({ status }: { status: PaymentStatus }) {
  const due = status === 'due';
  return (
    <Text
      style={[
        styles.badge,
        due
          ? { color: Colors.current.error, backgroundColor: Colors.current.errorBackground }
          : { color: Colors.current.success, backgroundColor: Colors.current.successBackground },
      ]}
      maxFontSizeMultiplier={1.4}>
      {due ? 'Da pagare' : 'Pagata'}
    </Text>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  badge: {
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 9,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
}));
