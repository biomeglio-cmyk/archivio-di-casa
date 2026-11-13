import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, LayoutAnimation, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { confirmDeleteCategory } from '@/actions/delete-actions';
import { documentQuickActions, runAccessibilityAction, type QuickAction } from '@/actions/quick-actions';
import { useReduceMotion } from '@/a11y/accessibility';
import { startAddCard } from '@/capture/start-add-card';
import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { BarcodeFullScreen, GeneratedCode } from '@/components/barcode-view';
import { PageHeader } from '@/components/page-header';
import { RoundIconButton } from '@/components/round-icon-button';
import { REORDER_FOOTER, ReorderHeader, ReorderRow, SortableList } from '@/components/sortable-list';
import { Text } from '@/components/text';
import { spacedNumber, WALLET_CARD_HEIGHT, WALLET_CARD_PEEK, WalletCardFace } from '@/components/wallet-card';
import { type Palette, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { listDocumentFiles, saveDocumentOrder } from '@/db/documents';
import type { Category, DocumentListItem } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useI18n } from '@/i18n';
import { useMaxBrightness } from '@/hooks/use-max-brightness';
import { resolveDocumentFile } from '@/storage/document-files';
import { generateBarcode } from '@/utils/barcode';
import { categoryTint } from '@/utils/colors';
import { whenBelowLimit } from '@/settings/free-limit';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const detailHref = (id: number) => ({ pathname: '/(tabs)/(archive)/document/[id]', params: { id: String(id) } }) as const;

type Props = {
  category: Category; // "Tessere e card"
  cards: DocumentListItem[];
};

// "Tessere" (docs/design/Tessere.dc.html): back and "+", title and "Tocca una tessera per mostrare
// il codice alla cassa", "Riordina", the cards stacked with only their top showing (the photo of the
// card as cover, or its color with name, Tipo, number and holder). A tap opens a card: the whole
// card, its code (redrawn from the number, so the checkout scanner reads it) with the number and
// "Chiudi"; the screen goes to full brightness while a card is open. The dashed "Nuova tessera".
// Our extras: "Dettagli" (the card screen: person, deadline, edit), tap the code for full screen,
// long press for the quick actions, "…" for the category.
export function CardsScreen({ category, cards }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const { tint, onTint, dashed } = categoryTint(category.colors, theme);
  const [openId, setOpenId] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const [menuFor, setMenuFor] = useState<DocumentListItem | null>(null);
  const [categoryMenu, setCategoryMenu] = useState(false);
  const reduceMotion = useReduceMotion();

  useMaxBrightness(openId !== null);

  function toggle(id: number) {
    if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((current) => (current === id ? null : id));
  }

  async function saveOrder(items: DocumentListItem[]) {
    try {
      await saveDocumentOrder(db, 'category', items.map((d) => d.id));
    } catch (error) {
      Alert.alert(t('cardsScreen.orderSaveFailed'), error instanceof Error ? error.message : String(error));
    }
  }

  const add = () => whenBelowLimit(() => startAddCard('push'));

  const categoryActions: SheetAction[] = [
    {
      key: 'edit',
      label: t('cardsScreen.editCategory'),
      symbol: 'pencil',
      onPress: () => router.push({ pathname: '/category-form', params: { id: String(category.id) } }),
    },
    { key: 'delete', label: t('cardsScreen.deleteCategory'), symbol: 'trash', destructive: true, onPress: () => confirmDeleteCategory(category) },
  ];

  return (
    <GestureHandlerRootView style={styles.screen}>
      <Animated.ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.page, { paddingTop: insets.top + 8, paddingBottom: Spacing.belowContent }]}>
        {reordering ? (
          <>
            <ReorderHeader
              title={t('cardsScreen.reorderTitle')}
              hint={t('cardsScreen.reorderHint')}
              onDone={() => setReordering(false)}
            />
            <Text style={styles.section} accessibilityRole="header">
              {t('cardsScreen.yourCards')}
            </Text>
            <View style={styles.reorderList}>
              <SortableList
                items={cards}
                keyFor={(card) => card.id}
                labelFor={(card) => [card.title, card.docType ?? card.personName].filter(Boolean).join(', ')}
                renderRow={(card) => (
                  <ReorderRow
                    thumb={
                      <View style={styles.thumb}>
                        <WalletCardFace card={card} height={54} scale={0.42} />
                      </View>
                    }
                    title={card.title}
                    subtitle={card.docType ?? card.personName}
                  />
                )}
                onReorder={saveOrder}
                scrollableRef={scrollRef}
              />
            </View>
            <Text style={styles.footer}>{REORDER_FOOTER}</Text>
          </>
        ) : (
          <>
            <PageHeader
              title={category.name === t('categories.builtin.cards') ? t('cardsScreen.title') : category.name}
              subtitle={t('cardsScreen.subtitle')}
              tint={tint}
              right={
                <>
                  <RoundIconButton
                    symbol="ellipsis"
                    accessibilityLabel={t('cardsScreen.categoryMenuLabel', { name: category.name })}
                    background={tint}
                    color={theme.text}
                    onPress={() => setCategoryMenu(true)}
                  />
                  <RoundIconButton
                    symbol="plus"
                    accessibilityLabel={t('cardsScreen.addCard')}
                    background={tint}
                    color={theme.text}
                    onPress={add}
                  />
                </>
              }
            />
            {cards.length > 1 && (
              <View style={styles.reorderLink}>
                <Pressable onPress={() => setReordering(true)} accessibilityRole="button" hitSlop={14}>
                  <Text style={styles.reorderText}>{t('cardsScreen.reorder')}</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.stack}>
              {cards.map((card) => (
                <WalletCard
                  key={card.id}
                  card={card}
                  open={card.id === openId}
                  tint={tint}
                  onTint={onTint}
                  actions={documentQuickActions(db, card, detailHref(card.id)).map((action) =>
                    action.key === 'open' ? { ...action, label: t('cardsScreen.cardDetails') } : action,
                  )}
                  onToggle={() => toggle(card.id)}
                  onLongPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setMenuFor(card);
                  }}
                />
              ))}
            </View>

            <Pressable
              onPress={add}
              accessibilityRole="button"
              style={({ pressed }) => [styles.add, { borderColor: dashed }, pressed && { backgroundColor: tint }]}>
              <SymbolView name="plus" tintColor={onTint} size={22} accessibilityElementsHidden importantForAccessibility="no" />
              <Text style={[styles.addLabel, { color: onTint }]}>{t('cardsScreen.newCard')}</Text>
            </Pressable>
          </>
        )}
      </Animated.ScrollView>

      <ActionSheet
        visible={menuFor !== null}
        title={menuFor?.title ?? ''}
        subtitle={menuFor?.docType ?? undefined}
        actions={
          menuFor
            ? documentQuickActions(db, menuFor, detailHref(menuFor.id)).map((action) =>
                action.key === 'open' ? { ...action, label: t('cardsScreen.cardDetails') } : action,
              )
            : []
        }
        onClose={() => setMenuFor(null)}
      />
      <ActionSheet
        visible={categoryMenu}
        title={t('cardsScreen.categoryMenuTitle', { name: category.name })}
        subtitle={t('cardsScreen.cardCount', { count: cards.length })}
        actions={categoryActions}
        onClose={() => setCategoryMenu(false)}
      />
    </GestureHandlerRootView>
  );
}

type CardProps = {
  card: DocumentListItem;
  open: boolean;
  tint: string;
  onTint: string;
  actions: QuickAction[]; // the long-press menu, also as VoiceOver actions
  onToggle: () => void;
  onLongPress: () => void;
};

// One card of the stack: closed = the top 86pt of its face; open = the whole face, then the code
function WalletCard({ card, open, tint, onTint, actions, onToggle, onLongPress }: CardProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  // Everything the face shows (also on a photo cover, which VoiceOver can't read)
  const label = [
    card.title,
    card.docType,
    card.barcodeValue ? t('a11y.walletCard.number', { number: spacedNumber(card.barcodeValue) }) : null,
    card.personName,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <View style={styles.card}>
      <Pressable
        onPress={onToggle}
        onLongPress={onLongPress}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? t('cardsScreen.cardOpenLabel', { label }) : t('cardsScreen.cardClosedLabel', { label })}
        // The long-press menu: "Dettagli della tessera", preferiti, Modifica, Sposta nel cestino
        accessibilityActions={actions.map((a) => ({ name: a.key, label: a.label }))}
        onAccessibilityAction={(event) => runAccessibilityAction(actions, event.nativeEvent.actionName)}
        style={{ height: open ? WALLET_CARD_HEIGHT : WALLET_CARD_PEEK, overflow: 'hidden' }}>
        <WalletCardFace card={{ ...card, holder: card.personName }} />
      </Pressable>
      {open && <CardCode card={card} tint={tint} onTint={onTint} onClose={onToggle} />}
    </View>
  );
}

// The code of an open card: redrawn from the number (or the photo of the code when its format is
// unknown), the number, "Chiudi" and "Dettagli". Tap the code: full screen.
function CardCode({ card, tint, onTint, onClose }: { card: DocumentListItem; tint: string; onTint: string; onClose: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const [fullScreen, setFullScreen] = useState(false);
  const { data: files } = useDbQuery((db) => listDocumentFiles(db, card.id), [card.id]);
  const generated = generateBarcode(card.barcodeValue, card.barcodeType);
  const photo = files?.find((f) => f.kind === 'image' && f.side === 'barcode');
  const photoUri = photo ? resolveDocumentFile(photo.path).uri : null;
  const boxWidth = width - Spacing.side * 2 - 32;

  return (
    <View style={styles.code}>
      {generated || photoUri ? (
        <Pressable
          onPress={() => setFullScreen(true)}
          accessibilityRole="button"
          accessibilityLabel={generated?.twoD ? t('cardsScreen.qrLabel') : t('cardsScreen.barcodeLabel')}
          accessibilityHint={t('cardsScreen.fullScreenHint')}
          style={styles.codeTouch}>
          {generated ? (
            <GeneratedCode barcode={generated} maxWidth={boxWidth} maxHeight={generated.twoD ? 150 : 80} />
          ) : (
            <Image source={{ uri: photoUri! }} style={styles.codePhoto} contentFit="contain" accessibilityIgnoresInvertColors />
          )}
        </Pressable>
      ) : (
        <Text style={styles.noCode}>{t('cardsScreen.noCode')}</Text>
      )}
      {card.barcodeValue ? (
        <Text
          style={styles.codeNumber}
          selectable
          accessibilityLabel={t('a11y.walletCard.number', { number: card.barcodeValue.split('').join(' ') })}>
          {spacedNumber(card.barcodeValue)}
        </Text>
      ) : null}
      <View style={styles.codeButtons}>
        <Pressable onPress={onClose} accessibilityRole="button" hitSlop={4} style={({ pressed }) => [styles.pill, { backgroundColor: tint }, pressed && styles.pressed]}>
          <Text style={[styles.pillText, { color: onTint }]}>{t('common.close')}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(detailHref(card.id))}
          accessibilityRole="button"
          hitSlop={4}
          style={({ pressed }) => [styles.pill, { backgroundColor: tint }, pressed && styles.pressed]}>
          <Text style={[styles.pillText, { color: onTint }]}>{t('cardsScreen.details')}</Text>
        </Pressable>
      </View>
      {(generated || photoUri) && (
        <BarcodeFullScreen
          barcode={generated}
          uri={photoUri}
          value={card.barcodeValue}
          visible={fullScreen}
          onClose={() => setFullScreen(false)}
        />
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  page: {
    paddingHorizontal: Spacing.side,
  },
  reorderLink: {
    marginTop: 14,
    alignItems: 'flex-end',
  },
  reorderText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    textTransform: 'uppercase',
    color: c.accent,
  },
  stack: {
    marginTop: 20,
    gap: 12,
  },
  card: {
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: c.surface, // white in light; the code itself always sits on white (GeneratedCode)
    boxShadow: '0 8px 22px rgba(28, 30, 70, 0.10)',
    overflow: 'hidden',
  },
  code: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 14,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF', // codes always on a white card (scanners at the checkout), day and night
  },
  codeTouch: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  codePhoto: {
    width: '100%',
    height: 110,
  },
  noCode: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONTS.regular,
    color: '#6A6D80', // on the white code card
    textAlign: 'center',
  },
  codeNumber: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    letterSpacing: 2,
    color: '#1C1E2E', // on the white code card
    fontVariant: ['tabular-nums'],
  },
  codeButtons: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  pill: {
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
  pressed: {
    opacity: 0.7,
  },
  add: {
    marginTop: 10,
    minHeight: 72,
    paddingVertical: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 22,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addLabel: {
    fontSize: 15,
    fontFamily: FONTS.medium,
  },
  section: {
    marginTop: 24,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: c.textSecondary,
  },
  reorderList: {
    marginTop: 12,
  },
  thumb: {
    width: 86,
    height: 54,
    borderRadius: 9,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  footer: {
    marginTop: 18,
    marginHorizontal: 4,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
    textAlign: 'center',
  },
});
