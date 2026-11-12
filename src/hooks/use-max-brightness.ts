import * as Brightness from 'expo-brightness';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { AppState } from 'react-native';

/**
 * Screen at full brightness while this screen is visible (and `enabled`: Tessere raises it only
 * while a card is open), so the cashier's scanner reads the
 * barcode. The previous brightness comes back when leaving the screen or the app.
 * (iOS keeps a brightness set by an app until the phone is locked, so we restore it ourselves.)
 */
export function useMaxBrightness(enabled = true) {
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return undefined;
      let saved: number | null = null; // brightness before we raised it
      let visible = true;

      async function raise() {
        try {
          if (saved === null) saved = await Brightness.getBrightnessAsync();
          if (visible && AppState.currentState === 'active') await Brightness.setBrightnessAsync(1);
        } catch {
          // brightness is a nicety: the card works anyway
        }
      }

      function restore() {
        if (saved === null) return;
        const previous = saved;
        saved = null;
        Brightness.setBrightnessAsync(previous).catch(() => {});
      }

      raise();
      // Back in the app → bright again; app in background or Control Center → normal brightness
      const subscription = AppState.addEventListener('change', (state) => (state === 'active' ? raise() : restore()));

      return () => {
        visible = false;
        subscription.remove();
        restore();
      };
    }, [enabled]),
  );
}
