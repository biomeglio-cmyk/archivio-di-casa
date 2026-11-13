import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import { SymbolView } from 'expo-symbols';

import { announce } from '@/a11y/accessibility';
import { Text } from '@/components/text';
import { type Palette, Radius } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// A short confirmation that blocks nothing ("Indirizzo copiato"): a pill near the bottom, for 1.6 s,
// above everything (sheets and modals too: FullWindowOverlay), read by VoiceOver. Unlike a second
// Alert it can't be presented over an Alert that is still closing.
const SHOW_MS = 1600;

let show: ((message: string) => void) | null = null;

export function showToast(message: string): void {
  if (show) show(message);
  announce(message);
}

export function ToastHost() {
  const styles = useThemedStyles(makeStyles);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const [shownAt, setShownAt] = useState(0);

  useEffect(() => {
    show = (next) => {
      setMessage(next);
      setShownAt(Date.now());
    };
    return () => {
      show = null;
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), SHOW_MS);
    return () => clearTimeout(timer);
  }, [message, shownAt]);

  if (!message) return null;
  return (
    <FullWindowOverlay>
      <View style={[styles.place, { bottom: insets.bottom + 96 }]} pointerEvents="none">
        <Animated.View
          key={shownAt}
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(200)}
          style={styles.pill}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          <SymbolView name="checkmark.circle.fill" tintColor={theme.success} size={18} />
          <Text style={styles.text}>{message}</Text>
        </Animated.View>
      </View>
    </FullWindowOverlay>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    place: {
      position: 'absolute',
      left: 22,
      right: 22,
      alignItems: 'center',
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      maxWidth: '100%',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: Radius.pill,
      backgroundColor: c.isDark ? '#2A2C48' : '#1C1E2E',
      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)',
    },
    text: {
      flexShrink: 1,
      fontSize: 15,
      fontFamily: FONTS.semiBold,
      color: '#FFFFFF',
    },
  });
