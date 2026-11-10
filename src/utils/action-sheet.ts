import { ActionSheetIOS } from 'react-native';

// Native iOS action sheet as a promise: the index of the chosen option, or null if cancelled.
// "Annulla" is added at the end automatically.
export function chooseAction(title: string, options: string[]): Promise<number | null> {
  return new Promise((resolve) => {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options: [...options, 'Annulla'], cancelButtonIndex: options.length },
      (index) => resolve(index < options.length ? index : null),
    );
  });
}
