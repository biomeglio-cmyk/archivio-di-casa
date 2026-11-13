import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

import { Text } from '@/components/text';
import { BRAND_COLOR, BRAND_GRADIENT } from '@/constants/brand';
import { FONTS } from '@/constants/typography';
import { t as translate, useI18n } from '@/i18n';
import { LOCK_AFTER_MS, authenticate, isAppLockEnabled, unlockMethod, useAppLockEnabled, type UnlockMethod } from '@/security/app-lock';
import { type Palette } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

// "Blocca con Face ID". Mounted once in the root layout, above everything.
// - locked: at a cold start, and back from the background after more than 1 minute.
//   The Face ID / passcode prompt starts by itself; the white button retries.
// - covered: while the app is inactive or in the background, the same red screen (without the
//   button) hides the documents, so the app switcher never shows them.
// FullWindowOverlay draws it in the window itself, so it also covers open sheets and modals,
// which a normal absolutely positioned View would not.
export function AppLock() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const enabled = useAppLockEnabled();
  const [locked, setLocked] = useState(isAppLockEnabled); // cold start: locked if the lock is on
  const [covered, setCovered] = useState(false);
  const [method, setMethod] = useState<UnlockMethod | null>(null); // null until known: "Sblocca"

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
      if (await authenticate(translate('appLock.prompt'))) setLockedBoth(false);
    } finally {
      authenticating.current = false;
    }
  }, [setLockedBoth]);

  // Cold start: ask right away
  useEffect(() => {
    unlockMethod().then(setMethod);
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

  const label = method ? t(`appLock.unlockWith.${method}`) : t('appLock.unlock');

  return (
    <FullWindowOverlay unstable_accessibilityContainerViewIsModal>
      <View style={styles.screen}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <SymbolView name="lock.fill" tintColor="#FFFFFF" size={56} />
        </View>
        <Text style={styles.name} maxFontSizeMultiplier={1.5}>
          {'Sottomano' /* i18n-ignore: brand */}
        </Text>
        <Text style={styles.message} maxFontSizeMultiplier={2}>
          {t('appLock.message')}
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

// White text needs a deep blue: the dark-mode accent (#8E9BFF) is too light under it
const LOCK_COLOR = (c: Palette) => (c.isDark ? BRAND_GRADIENT[0] : BRAND_COLOR(c));

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: LOCK_COLOR(c),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  name: {
    marginTop: 16,
    color: '#FFFFFF',
    fontSize: 40,
    lineHeight: 50,
    fontFamily: FONTS.wordmark,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 17,
    textAlign: 'center',
    fontFamily: FONTS.medium,
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
    color: LOCK_COLOR(c),
    fontSize: 17,
    fontFamily: FONTS.semiBold,
    textAlign: 'center',
  },
});
