import Storage from 'expo-sqlite/kv-store';
import { ActionSheetIOS } from 'react-native';

export type ShareFormat = 'combined' | 'separate';

const LABELS: Record<ShareFormat, string> = {
  combined: "Un'immagine (fronte sopra, retro sotto)",
  separate: 'Due immagini separate',
};

// Small key-value store that ships with expo-sqlite (like localStorage, but persistent on the phone)
const STORAGE_KEY = 'share.frontBackFormat';

function lastFormat(): ShareFormat {
  return Storage.getItemSync(STORAGE_KEY) === 'separate' ? 'separate' : 'combined';
}

// Native iOS action sheet. The last choice comes first. Resolves null if the user cancels.
export function askShareFormat(): Promise<ShareFormat | null> {
  const first = lastFormat();
  const order: ShareFormat[] = first === 'combined' ? ['combined', 'separate'] : ['separate', 'combined'];

  return new Promise((resolve) => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Come vuoi inviare fronte e retro?',
        options: [...order.map((f) => LABELS[f]), 'Annulla'],
        cancelButtonIndex: order.length,
      },
      (index) => {
        const choice = order[index];
        if (!choice) {
          resolve(null);
          return;
        }
        Storage.setItemSync(STORAGE_KEY, choice);
        resolve(choice);
      },
    );
  });
}
