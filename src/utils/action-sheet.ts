import { ActionSheetIOS } from 'react-native';

import { t } from '@/i18n';

// Native iOS action sheet as a promise: the index of the chosen option, or null if cancelled.
// "Annulla" (Cancel) is added at the end automatically.
export function chooseAction(title: string, options: string[]): Promise<number | null> {
  return new Promise((resolve) => {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options: [...options, t('common.cancel')], cancelButtonIndex: options.length },
      (index) => resolve(index < options.length ? index : null),
    );
  });
}
