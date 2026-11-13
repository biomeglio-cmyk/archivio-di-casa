import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';

// iOS accessibility settings the app follows, kept up to date while it runs:
// - Riduci movimento: no slides, zooms or wiggles (Reanimated already follows it by itself)
// - Testo in grassetto: Onest is a custom font, so the app moves every weight up a step itself
// - Aumenta contrasto: stronger greys, borders and accents (theme/theme-provider.tsx)
export type AccessibilitySettings = { reduceMotion: boolean; boldText: boolean; increaseContrast: boolean };

const INITIAL: AccessibilitySettings = { reduceMotion: false, boldText: false, increaseContrast: false };
let current = INITIAL; // for code outside components (Modal animation types, scrolls)

export const AccessibilityContext = createContext<AccessibilitySettings>(INITIAL);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(INITIAL);

  useEffect(() => {
    let active = true;
    const update = (patch: Partial<AccessibilitySettings>) => {
      if (!active) return;
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        current = next;
        return next;
      });
    };
    void Promise.all([
      AccessibilityInfo.isReduceMotionEnabled(),
      AccessibilityInfo.isBoldTextEnabled(),
      AccessibilityInfo.isDarkerSystemColorsEnabled(),
    ]).then(([reduceMotion, boldText, increaseContrast]) => update({ reduceMotion, boldText, increaseContrast }));
    const subscriptions = [
      AccessibilityInfo.addEventListener('reduceMotionChanged', (reduceMotion) => update({ reduceMotion })),
      AccessibilityInfo.addEventListener('boldTextChanged', (boldText) => update({ boldText })),
      AccessibilityInfo.addEventListener('darkerSystemColorsChanged', (increaseContrast) => update({ increaseContrast })),
    ];
    return () => {
      active = false;
      subscriptions.forEach((s) => s.remove());
    };
  }, []);

  return <AccessibilityContext value={settings}>{children}</AccessibilityContext>;
}

export function useAccessibilitySettings(): AccessibilitySettings {
  return use(AccessibilityContext);
}

export function useReduceMotion(): boolean {
  return use(AccessibilityContext).reduceMotion;
}

// Outside components: the settings as last read
export function accessibilitySettings(): AccessibilitySettings {
  return current;
}

// RN Modal animationType: a slide becomes a fade with Riduci movimento
export function modalAnimation(reduceMotion: boolean = current.reduceMotion): 'slide' | 'fade' {
  return reduceMotion ? 'fade' : 'slide';
}

// Says a change VoiceOver can't see by itself ("Pagina 3 aggiunta", "2 risultati"); no-op without VoiceOver
export function announce(message: string | null | undefined): void {
  if (message) AccessibilityInfo.announceForAccessibility(message);
}
