import { useState } from 'react';

/**
 * Pressed state for a Pressable, kept in React state instead of a style function.
 * Spread `handlers` on the Pressable and use `pressed` in a plain (static) style array:
 *
 *   const { pressed, handlers } = usePressed();
 *   <Pressable {...handlers} style={[styles.row, pressed && styles.pressed]} />
 */
export function usePressed() {
  const [pressed, setPressed] = useState(false);
  return {
    pressed,
    handlers: {
      onPressIn: () => setPressed(true),
      onPressOut: () => setPressed(false),
    },
  };
}
