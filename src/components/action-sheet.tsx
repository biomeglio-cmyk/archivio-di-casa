import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useRef } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { type Palette } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { useI18n } from '@/i18n';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

export type SheetAction = {
  key: string;
  label: string;
  symbol: SFSymbol;
  destructive?: boolean; // red on soft red (e.g. "Cancella categoria")
  onPress: () => void;
};

type Props = {
  visible: boolean;
  title: string; // "Categoria Bollette"
  subtitle?: string; // "12 documenti"
  actions: SheetAction[];
  onClose: () => void;
};

// Bottom sheet of the design (Archivio "…"): dimmed page, white panel with 30pt top corners and a
// grabber, a title, 56-high rounded actions, "Annulla". Tap outside closes it. The chosen action
// runs after the sheet is gone, so its alerts and screens are never hidden behind it.
export function ActionSheet({ visible, title, subtitle, actions, onClose }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const pending = useRef<(() => void) | null>(null);

  function choose(action: SheetAction) {
    pending.current = action.onPress;
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onDismiss={() => {
        const action = pending.current;
        pending.current = null;
        action?.();
      }}>
      <View style={styles.fill} accessibilityViewIsModal onAccessibilityEscape={onClose}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 14 }]} accessibilityRole="menu">
          <View style={styles.grabber} />
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          <View style={styles.actions}>
            {actions.map((action) => {
              const color = action.destructive ? theme.error : theme.text;
              return (
                <Pressable
                  key={action.key}
                  onPress={() => choose(action)}
                  accessibilityRole="menuitem"
                  style={({ pressed }) => [
                    styles.action,
                    { backgroundColor: action.destructive ? theme.errorBackground : theme.paleLilac },
                    pressed && styles.pressed,
                  ]}>
                  <SymbolView name={action.symbol} tintColor={color} size={20} />
                  <Text style={[styles.actionLabel, { color }]}>{action.label}</Text>
                </Pressable>
              );
            })}
            <Pressable onPress={onClose} accessibilityRole="button" style={styles.cancel}>
              <Text style={styles.cancelLabel}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  fill: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(28, 30, 70, 0.35)',
  },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderCurve: 'continuous',
    paddingTop: 10,
    paddingHorizontal: 20,
    boxShadow: '0 -10px 30px rgba(28, 30, 70, 0.12)',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: c.switchOff,
  },
  title: {
    marginTop: 18,
    marginHorizontal: 4,
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  subtitle: {
    marginTop: 2,
    marginHorizontal: 4,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  actions: {
    marginTop: 16,
    gap: 8,
  },
  action: {
    minHeight: 56,
    borderRadius: 18,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.medium,
  },
  pressed: {
    opacity: 0.7,
  },
  cancel: {
    marginTop: 4,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: c.indigo,
  },
});
