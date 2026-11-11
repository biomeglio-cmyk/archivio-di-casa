import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

import { BRAND_COLOR, FONTS } from '@/constants/brand';
import { LOCK_AFTER_MS, authenticate, isAppLockEnabled, unlockLabel, useAppLockEnabled } from '@/security/app-lock';

// "Blocca con Face ID". Mounted once in the root layout, above everything.
// - locked: at a cold start, and back from the background after more than 1 minute.
//   The Face ID / passcode prompt starts by itself; the white button retries.
// - covered: while the app is inactive or in the background, the same red screen (without the
//   button) hides the documents, so the app switcher never shows them.
// FullWindowOverlay draws it in the window itself, so it also covers open sheets and modals,
// which a normal absolutely positioned View would not.
export function AppLock() {
  const enabled = useAppLockEnabled();
  const [locked, setLocked] = useState(isAppLockEnabled); // cold start: locked if the lock is on
  const [covered, setCovered] = useState(false);
  const [label, setLabel] = useState('Sblocca');

  const lockedRef = useRef(locked); // the latest value, for the AppState listener
  const authenticating = useRef(false);
  const backgroundAt = useRef<number | null>(null);

  const setLockedBoth = useCallback((value: boolean) => {
    lockedRef.current = value;
    setLocked(value);
  }, []);

  const unlock = useCallback(async () => {
    if (authenticating.current) return; // one prompt at a time
    authenticating.current = true;
    try {
      if (await authenticate('Sblocca Sottomano')) setLockedBoth(false);
    } finally {
      authenticating.current = false;
    }
  }, [setLockedBoth]);

  // Cold start: ask right away
  useEffect(() => {
    unlockLabel().then(setLabel);
    if (lockedRef.current) unlock();
  }, [unlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (!isAppLockEnabled()) {
        setCovered(false);
        return;
      }
      if (state === 'background') {
        backgroundAt.current ??= Date.now();
        setCovered(true);
      } else if (state === 'inactive') {
        // The Face ID prompt itself makes the app inactive: no need to cover the lock screen
        if (!authenticating.current) setCovered(true);
      } else if (state === 'active') {
        const away = backgroundAt.current;
        backgroundAt.current = null;
        if (away !== null && Date.now() - away > LOCK_AFTER_MS) setLockedBoth(true);
        setCovered(false);
        if (lockedRef.current) unlock();
      }
    });
    return () => subscription.remove();
  }, [unlock, setLockedBoth]);

  // Lock turned off from the Menu: nothing is shown. Turned on: the app is already unlocked.
  if (!enabled || (!locked && !covered)) return null;

  return (
    <FullWindowOverlay unstable_accessibilityContainerViewIsModal>
      <View style={styles.screen}>
        <SymbolView name="lock.fill" tintColor="#FFFFFF" size={56} />
        <Text style={styles.name} maxFontSizeMultiplier={1.5}>
          sottomano
        </Text>
        <Text style={styles.message} maxFontSizeMultiplier={2}>
          I tuoi documenti sono protetti
        </Text>
        {locked && (
          <Pressable
            onPress={unlock}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Text style={styles.buttonText} maxFontSizeMultiplier={2}>
              {label}
            </Text>
          </Pressable>
        )}
      </View>
    </FullWindowOverlay>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BRAND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  name: {
    marginTop: 16,
    color: '#FFFFFF',
    fontSize: 40,
    fontFamily: FONTS.titleBold,
  },
  message: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 17,
    textAlign: 'center',
    fontFamily: FONTS.titleMedium,
  },
  button: {
    marginTop: 32,
    minHeight: 50,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: BRAND_COLOR,
    fontSize: 17,
    fontFamily: FONTS.titleSemiBold,
    textAlign: 'center',
  },
});
