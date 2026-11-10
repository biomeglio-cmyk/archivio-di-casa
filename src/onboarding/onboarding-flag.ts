import Storage from 'expo-sqlite/kv-store';

// "Consigli iniziali" seen once: remembered with the expo-sqlite key-value store
const KEY = 'onboarding.done';

export function hasSeenOnboarding(): boolean {
  return Storage.getItemSync(KEY) === '1';
}

export function markOnboardingSeen(): void {
  Storage.setItemSync(KEY, '1');
}
