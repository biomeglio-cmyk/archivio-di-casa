import { useMemo } from 'react';
import { PanResponder } from 'react-native';

// Swipe shared by the week and the month calendar of Scadenze

const SWIPE_DISTANCE = 50; // points of horizontal movement needed to change week or month

// Horizontal swipe on a calendar card: left = next, right = previous. Only clearly horizontal
// moves are taken, so taps on the days and the vertical scroll keep working.
export function useHorizontalSwipe(onPrevious: () => void, onNext: () => void) {
  return useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_, g) => {
          if (g.dx <= -SWIPE_DISTANCE) onNext();
          else if (g.dx >= SWIPE_DISTANCE) onPrevious();
        },
      }),
    [onPrevious, onNext],
  ).panHandlers;
}
