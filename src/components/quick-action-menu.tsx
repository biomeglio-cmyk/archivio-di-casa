import { SymbolView } from 'expo-symbols';
import { useRef, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import type { QuickAction } from '@/actions/quick-actions';
import { DANGER_COLOR } from '@/constants/brand';
import { useI18n } from '@/i18n';
import { type Palette, Radius, Shadows } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

export type TileRect = { x: number; y: number; width: number; height: number }; // in the window

export type QuickMenuTarget = {
  rect: TileRect; // where the tile is on screen (the menu is anchored to it)
  tile: ReactNode; // a copy of the tile, drawn above the dimmed screen
  actions: QuickAction[];
};

const MENU_WIDTH = 250;
const ROW_HEIGHT = 48;
const GAP = 8;
const EDGE = 16;

// The quick-action menu of a long press without moving, like the iOS Home Screen: the rest of
// the screen dims, the tile stays lit, a rounded menu sits under it (above, if there is no room).
// Tap outside (or the VoiceOver escape gesture) closes it. An action runs after the menu is gone,
// so its alerts and screens are never hidden behind it.
export function QuickActionMenu({ target, onClose }: { target: QuickMenuTarget | null; onClose: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const theme = useTheme();
  const { t } = useI18n();
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pending = useRef<(() => void) | null>(null);

  function choose(action: QuickAction) {
    pending.current = action.onPress;
    onClose();
  }

  function runPending() {
    const action = pending.current;
    pending.current = null;
    action?.();
  }

  // Larger text: taller rows (the labels wrap) and a menu as wide as the screen
  const large = window.fontScale > 1.3;
  const rowHeight = Math.max(ROW_HEIGHT, Math.round(17 * 1.3 * window.fontScale + 24));
  const menuWidth = large ? window.width - 2 * EDGE : MENU_WIDTH;
  let menu = { left: EDGE, top: 0 };
  if (target) {
    const { rect, actions } = target;
    const height = actions.length * rowHeight;
    const below = rect.y + rect.height + GAP;
    const fitsBelow = below + height <= window.height - insets.bottom - EDGE;
    menu = {
      left: Math.min(Math.max(EDGE, rect.x), window.width - menuWidth - EDGE),
      top: fitsBelow ? below : Math.max(insets.top + EDGE, rect.y - GAP - height),
    };
  }

  return (
    <Modal
      visible={target !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={runPending} // iOS: after the fade-out
    >
      {target && (
        <View style={styles.fill} accessibilityViewIsModal onAccessibilityEscape={onClose}>
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('quickActionMenu.close')}
          />
          {/* The lit copy of the tile: only a picture, VoiceOver skips it */}
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.tile,
              { left: target.rect.x, top: target.rect.y, width: target.rect.width, height: target.rect.height },
            ]}>
            {target.tile}
          </View>
          <View
            style={[styles.menu, { left: menu.left, top: menu.top, width: menuWidth, backgroundColor: theme.surface }]}
            accessibilityRole="menu">
            {target.actions.map((action, index) => {
              const color = action.destructive ? DANGER_COLOR(theme) : theme.text;
              return (
                <Pressable
                  key={action.key}
                  onPress={() => choose(action)}
                  accessibilityRole="menuitem"
                  accessibilityLabel={action.label}
                  style={({ pressed }) => [
                    styles.row,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.separator },
                    pressed && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  <Text style={[styles.label, { color }]} numberOfLines={large ? undefined : 1}>
                    {action.label}
                  </Text>
                  <SymbolView name={action.symbol} tintColor={color} size={18} />
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  fill: {
    flex: 1,
  },
  tile: {
    position: 'absolute',
    transform: [{ scale: 1.03 }],
  },
  menu: {
    position: 'absolute',
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    boxShadow: Shadows.dialog,
  },
  row: {
    minHeight: ROW_HEIGHT,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
  },
  label: {
    flexShrink: 1,
    fontSize: 17,
  },
});
