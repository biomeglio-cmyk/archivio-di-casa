import * as LocalAuthentication from 'expo-local-authentication';
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

// "Blocca con Face ID": on/off, kept on the phone in the key-value store (never in a backup)
const KEY = 'security.appLock';

// Out of the app for longer than this, it locks again
export const LOCK_AFTER_MS = 60_000;

let enabled: boolean | null = null;
const listeners = new Set<() => void>();

export function isAppLockEnabled(): boolean {
  if (enabled === null) {
    try {
      enabled = Storage.getItemSync(KEY) === 'on';
    } catch {
      enabled = false;
    }
  }
  return enabled;
}

function setAppLockEnabled(value: boolean): void {
  Storage.setItemSync(KEY, value ? 'on' : 'off');
  enabled = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The switch state, re-rendering when it changes (same pattern as usePreferences)
export function useAppLockEnabled(): boolean {
  return useSyncExternalStore(subscribe, isAppLockEnabled);
}

// Face ID (or Touch ID), with the iPhone passcode as fallback. In Expo Go Face ID is not
// available, so iOS asks the passcode directly: that is expected.
export async function authenticate(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Annulla',
    disableDeviceFallback: false,
  });
  return result.success;
}

export type EnableResult = 'enabled' | 'no-passcode' | 'cancelled';

// Turning the lock on: only if the iPhone has a passcode (or biometrics), and after one
// successful authentication, so nobody locks themselves out by mistake
export async function enableAppLock(): Promise<EnableResult> {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  if (level === LocalAuthentication.SecurityLevel.NONE) return 'no-passcode';
  if (!(await authenticate('Conferma per attivare il blocco'))) return 'cancelled';
  setAppLockEnabled(true);
  return 'enabled';
}

export function disableAppLock(): void {
  setAppLockEnabled(false);
}

// Label of the button on the lock screen, from what this iPhone actually has
export async function unlockLabel(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (enrolled && types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Sblocca con Face ID';
    if (enrolled && types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'Sblocca con Touch ID';
  } catch {
    // fall through to the passcode
  }
  return 'Sblocca con il codice';
}
