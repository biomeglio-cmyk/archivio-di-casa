import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { QuickAction } from '@/actions/quick-actions';
import { accessibilityActionsOf, runAccessibilityAction } from '@/actions/quick-actions';
import { IconSquare } from '@/components/icon-square';
import { PasswordPreviewTile } from '@/components/password-preview';
import type { TileRect } from '@/components/quick-action-menu';
import { StatusBadge } from '@/components/status-badge';
import { Text } from '@/components/text';
import { BRAND_COLOR } from '@/constants/brand';
import { DEFAULT_CARD_COLOR } from '@/constants/card-colors';
import { Colors, themedStyles } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import type { DocumentListItem } from '@/db/types';
import { usePressed } from '@/hooks/use-pressed';
import { resolveDocumentFile } from '@/storage/document-files';
import { folderRowSubtitle } from '@/utils/folder';
import { formatEuro } from '@/utils/money';
import { isLightColor } from '@/utils/colors';

const LONG_PRESS_MS = 400;
export const FOLDER_ROW_INSET = 74; // separators start after the 44pt icon (16 + 44 + 14)

type Props = {
  document: DocumentListItem;
  onPress: () => void;
  actions: QuickAction[]; // long press menu and VoiceOver actions
  onLongPress: (rect: TileRect) => void;
  selection?: { selected: boolean; disabled: boolean }; // "Seleziona": a tick instead of the amount
};

// A row of a folder (docs/design/Archivio.dc.html): 44pt square in the category gradient (or the
// cover photo / picked color), name 16/600 and "Scade il…" 13, amount 16/600 and the
// Da pagare / Pagata badge on the right. Long press: the quick-action menu.
export function FolderRow({ document, onPress, actions, onLongPress, selection }: Props) {
  const { pressed, handlers } = usePressed();
  const ref = useRef<ComponentRef<typeof View>>(null);
  const { category } = document;
  const subtitle = folderRowSubtitle(document);
  const showPhoto = document.firstImagePath !== null && document.coverMode === 'photo';
  const solid = document.coverColor ?? (category.isCards ? (document.cardColor ?? DEFAULT_CARD_COLOR) : null);
  const amount = document.amountCents !== null ? formatEuro(document.amountCents) : null;
  const status = document.paymentStatus === 'due' ? 'da pagare' : document.paymentStatus === 'paid' ? 'pagata' : null;

  function longPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    ref.current?.measureInWindow((x, y, width, height) => onLongPress({ x, y, width, height }));
  }

  return (
    <View ref={ref} collapsable={false}>
      <Pressable
        {...handlers}
        onPress={onPress}
        onLongPress={selection ? undefined : longPress}
        delayLongPress={LONG_PRESS_MS}
        disabled={selection?.disabled}
        accessibilityRole={selection ? 'checkbox' : 'button'}
        accessibilityState={selection ? { checked: selection.selected, disabled: selection.disabled } : undefined}
        accessibilityLabel={[document.title, subtitle, amount, status].filter(Boolean).join(', ')}
        accessibilityActions={selection ? undefined : accessibilityActionsOf(actions)}
        onAccessibilityAction={(event) => runAccessibilityAction(actions, event.nativeEvent.actionName)}
        style={[styles.row, pressed && styles.pressed, selection?.disabled && styles.disabled]}>
        {document.password ? (
          // A Password entry: its "Anteprima" (color and icon, or its image)
          <PasswordPreviewTile info={document.password} size={44} shadow={false} />
        ) : showPhoto && document.firstImagePath ? (
          <Image
            source={{ uri: resolveDocumentFile(document.firstImagePath).uri }}
            style={styles.photo}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ) : solid ? (
          <View style={[styles.photo, styles.center, { backgroundColor: solid }]}>
            <SymbolView name={category.symbol} tintColor={isLightColor(solid) ? '#1C1E2E' : '#FFFFFF'} size={22} />
          </View>
        ) : (
          <IconSquare symbol={category.symbol} colors={category.colors} size={44} shadow />
        )}
        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={2}>
            {document.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        {selection ? (
          <SymbolView
            name={selection.selected ? 'checkmark.circle.fill' : 'circle'}
            tintColor={selection.selected ? BRAND_COLOR : Colors.current.dashed}
            size={24}
          />
        ) : (
          (amount || document.paymentStatus) && (
            <View style={styles.right}>
              {amount && <Text style={styles.amount}>{amount}</Text>}
              {document.paymentStatus && <StatusBadge status={document.paymentStatus} />}
            </View>
          )
        )}
      </Pressable>
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  pressed: {
    backgroundColor: Colors.current.paleLilac,
  },
  disabled: {
    opacity: 0.4,
  },
  photo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: Colors.current.text,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
    gap: 5,
  },
  amount: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: Colors.current.text,
  },
}));
