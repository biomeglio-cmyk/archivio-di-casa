import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { FONTS } from '@/constants/brand';

type Props = {
  onEdit: () => void;
  onDelete: () => void;
  children: ReactNode;
};

// Swipe left on a row to reveal "Modifica" and "Elimina", like Mail or Reminders
export function SwipeableRow({ onEdit, onDelete, children }: Props) {
  const swipeRef = useRef<SwipeableMethods>(null);

  // Close the row first, so it is back in place when the sheet or the alert closes
  function run(action: () => void) {
    swipeRef.current?.close();
    action();
  }

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <View style={styles.actions}>
          <Action label="Modifica" symbol="pencil" color="#8E8E93" onPress={() => run(onEdit)} />
          <Action label="Elimina" symbol="trash" color="#E5383B" onPress={() => run(onDelete)} />
        </View>
      )}>
      {children}
    </ReanimatedSwipeable>
  );
}

function Action({ label, symbol, color, onPress }: { label: string; symbol: SFSymbol; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.action, { backgroundColor: color }, pressed && styles.pressed]}>
      <SymbolView name={symbol} tintColor="#FFFFFF" size={18} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  action: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONTS.titleSemiBold,
  },
});
