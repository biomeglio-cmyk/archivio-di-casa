import { useNavigation } from 'expo-router';
import { useEffect, useRef } from 'react';

/**
 * Leaves the current screen when the item it shows disappears from the database
 * (e.g. deleted from its edit sheet). `item`: undefined = loading, null = not found.
 * goBack() of THIS screen's navigation pops it from its own tab stack,
 * even while an edit sheet or modal is still on top.
 */
export function useLeaveWhenDeleted(item: unknown) {
  const navigation = useNavigation();
  const wasLoaded = useRef(false);

  useEffect(() => {
    if (item) {
      wasLoaded.current = true;
    } else if (item === null && wasLoaded.current && navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [item, navigation]);
}
