import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import type { QuickAction } from '@/actions/quick-actions';
import { accessibilityActionsOf, runAccessibilityAction } from '@/actions/quick-actions';
import { useIconRow } from '@/components/icon-row';
import { IconSquare } from '@/components/icon-square';
import { PasswordPreviewTile } from '@/components/password-preview';
import type { TileRect } from '@/components/quick-action-menu';
import { StatusBadge } from '@/components/status-badge';
import { Text } from '@/components/text';
import { BRAND_COLOR } from '@/constants/brand';
import { DEFAULT_CARD_COLOR } from '@/constants/card-colors';
import { type Palette } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import type { DocumentListItem } from '@/db/types';
import { usePressed } from '@/hooks/use-pressed';
import { useI18n } from '@/i18n';
import { resolveDocumentFile } from '@/storage/document-files';
import { folderRowSubtitle } from '@/utils/folder';
import { formatEuro } from '@/utils/money';
import { textOn } from '@/utils/colors';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

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
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n(); // also re-renders the subtitle when the language changes
  const { pressed, handlers } = usePressed();
  const { fontScale } = useWindowDimensions();
  const large = fontScale > 1.3; // larger text: full name and subtitle, the amount under them
  const iconRow = useIconRow(); // large text: the square above the texts, the selection tick under them on the right
  const ref = useRef<ComponentRef<typeof View>>(null);
  const { category } = document;
  const subtitle = folderRowSubtitle(document);
  const showPhoto = document.firstImagePath !== null && document.coverMode === 'photo';
  const solid = document.coverColor ?? (category.isCards ? (document.cardColor ?? DEFAULT_CARD_COLOR) : null);
  const amount = document.amountCents !== null ? formatEuro(document.amountCents) : null;
  const status = document.paymentStatus === 'due' ? t('folderRow.due') : document.paymentStatus === 'paid' ? t('folderRow.paid') : null;

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
        accessibilityHint={selection?.disabled ? t('a11y.folderRow.disabledHint') : undefined}
        accessibilityActions={selection ? undefined : accessibilityActionsOf(actions)}
        onAccessibilityAction={(event) => runAccessibilityAction(actions, event.nativeEvent.actionName)}
        style={[styles.row, iconRow.row, pressed && styles.pressed, selection?.disabled && styles.disabled]}>
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
            <SymbolView name={category.symbol} tintColor={textOn(solid)} size={22} />
          </View>
        ) : (
          <IconSquare symbol={category.symbol} colors={category.colors} size={44} shadow />
        )}
        <View style={[styles.texts, iconRow.texts]}>
          <Text style={styles.title} numberOfLines={large ? undefined : 2}>
            {document.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={large ? undefined : 2}>
            {subtitle}
          </Text>
          {large && !selection && (amount || document.paymentStatus) && (
            <View style={styles.rightBelow}>
              {amount && <Text style={styles.amount}>{amount}</Text>}
              {document.paymentStatus && <StatusBadge status={document.paymentStatus} />}
            </View>
          )}
        </View>
        {selection ? (
          <View style={iconRow.trailingEnd}>
            <SymbolView
              name={selection.selected ? 'checkmark.circle.fill' : 'circle'}
              tintColor={selection.selected ? BRAND_COLOR(theme) : theme.dashed}
              size={24}
            />
          </View>
        ) : (
          !large &&
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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  pressed: {
    backgroundColor: c.paleLilac,
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
    color: c.text,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
    gap: 5,
  },
  rightBelow: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  amount: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
});
