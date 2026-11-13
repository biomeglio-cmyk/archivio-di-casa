import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { DateSquare } from '@/components/date-square';
import { Text } from '@/components/text';
import { TileTitle } from '@/components/tile-title';
import { WhiteCard } from '@/components/white-card';
import { DEFAULT_CARD_COLOR } from '@/constants/card-colors';
import { type Palette, Radius, tintedShadow } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import type { DocumentListItem } from '@/db/types';
import { usePressed } from '@/hooks/use-pressed';
import { t, useI18n } from '@/i18n';
import { useFormat } from '@/i18n/use-format';
import { resolveDocumentFile } from '@/storage/document-files';
import { categoryShadowRgb, hexToRgb, textOn } from '@/utils/colors';
import { describeDistance, formatShortDate, parseISODate } from '@/utils/dates';
import { formatEuro } from '@/utils/money';
import { daysUntil } from '@/utils/deadlines';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const FAVORITE_HEIGHT = 196; // grows with larger text
// The favorites of the design use a steeper gradient than the category squares (160°)
const FAVORITE_START = { x: 0.33, y: 0 };
const FAVORITE_END = { x: 0.67, y: 1 };

function openDocument(document: DocumentListItem) {
  router.push({ pathname: '/(tabs)/(archive)/document/[id]', params: { id: String(document.id) } });
}

// Under the name of a favorite: its deadline in words, otherwise its category (and person)
function favoriteSubtitle(document: DocumentListItem): string {
  if (document.expiresAt) {
    const days = daysUntil(document.expiresAt);
    if (days < 0) return t('homeSections.expired');
    if (days === 0) return t('homeSections.expiresToday');
    if (days === 1) return t('homeSections.expiresTomorrow');
    if (days <= 30) return t('homeSections.expiresInDays', { count: days });
    return t('homeSections.expiresOn', { date: formatShortDate(document.expiresAt) });
  }
  return [document.category.name, document.personName].filter(Boolean).join(' · ');
}

// One of the two big favorites of Home (196 high): the category gradient with its icon, or (cover
// "Foto") the photo at the top; a picked color (or a card's color) as a solid background.
// Name 17/600 and the deadline 13/400 at the bottom: in the category's readable text color, on a
// solid color dark ink or white, whichever reads (textOn).
export function FavoriteTile({ document }: { document: DocumentListItem }) {
  const styles = useThemedStyles(makeStyles);
  useI18n(); // re-render when the language changes
  const { pressed, handlers } = usePressed();
  const { fontScale } = useWindowDimensions();
  const { category } = document;
  const showPhoto = document.firstImagePath !== null && document.coverMode !== 'color';
  const solid = document.coverColor ?? (category.isCards ? (document.cardColor ?? DEFAULT_CARD_COLOR) : null);
  const textColor = solid ? textOn(solid) : category.colors.text;
  const shadow = tintedShadow(solid ? hexToRgb(solid) : categoryShadowRgb(category.colors));
  const subtitle = favoriteSubtitle(document);

  const content = (
    <>
      {showPhoto && document.firstImagePath ? (
        <Image
          source={{ uri: resolveDocumentFile(document.firstImagePath).uri }}
          style={styles.photo}
          contentFit="cover"
          transition={120}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <SymbolView name={category.symbol} tintColor={textColor} size={28} />
      )}
      <View style={styles.bottom}>
        <TileTitle style={[styles.title, { color: textColor }]}>{document.title}</TileTitle>
        {subtitle.length > 0 && (
          <Text style={[styles.subtitle, { color: textColor }]} numberOfLines={fontScale > 1.3 ? undefined : 2}>
            {subtitle}
          </Text>
        )}
      </View>
    </>
  );

  return (
    <Pressable
      {...handlers}
      onPress={() => openDocument(document)}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${document.title}, ${subtitle}` : document.title}
      style={[styles.favorite, { boxShadow: shadow }, pressed && styles.pressed]}>
      {solid ? (
        <View style={[styles.fill, { backgroundColor: solid }]}>{content}</View>
      ) : (
        <LinearGradient
          colors={[category.colors.top, category.colors.bottom]}
          start={FAVORITE_START}
          end={FAVORITE_END}
          style={styles.fill}>
          {content}
        </LinearGradient>
      )}
    </Pressable>
  );
}

// "Tra 3 giorni · € 84,20": the distance (capitalized) and the amount; without an amount, the person
function deadlineSubtitle(document: DocumentListItem, days: number): string {
  const distance = describeDistance(days);
  const extra = document.amountCents !== null ? formatEuro(document.amountCents) : document.personName;
  return [distance.charAt(0).toUpperCase() + distance.slice(1), extra].filter(Boolean).join(' · ');
}

// The next deadline of Home: date square in the main gradient, name 16/600, distance 13 indigo,
// chevron; in a white card. Tap opens the document.
export function NextDeadlineCard({ document }: { document: DocumentListItem }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  useI18n(); // re-render when the language changes
  const fmt = useFormat();
  const { pressed, handlers } = usePressed();
  const { fontScale } = useWindowDimensions();
  const large = fontScale > 1.3; // larger text: the whole name and subtitle
  if (!document.expiresAt) return null;
  const days = daysUntil(document.expiresAt);
  const subtitle = deadlineSubtitle(document, days);

  return (
    <WhiteCard style={styles.deadlineCard}>
      <Pressable
        {...handlers}
        onPress={() => openDocument(document)}
        accessibilityRole="button"
        // One element: "Bolletta luce, 14 novembre, Tra 3 giorni · € 84,20"
        accessibilityLabel={[document.title, fmt.dayMonth(parseISODate(document.expiresAt)), subtitle].join(', ')}
        style={[styles.deadlineRow, pressed && styles.pressed]}>
        <DateSquare iso={document.expiresAt} highlighted />
        <View style={styles.deadlineTexts}>
          <Text style={styles.deadlineTitle} numberOfLines={large ? undefined : 2}>
            {document.title}
          </Text>
          <Text style={styles.deadlineSubtitle} numberOfLines={large ? undefined : 1}>
            {subtitle}
          </Text>
        </View>
        <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={16} weight="semibold" />
      </Pressable>
    </WhiteCard>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  favorite: {
    flex: 1,
    minHeight: FAVORITE_HEIGHT,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
  },
  fill: {
    flexGrow: 1, // not flex: 1, so larger text makes the tile taller instead of being cut
    padding: 16,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: 96,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  bottom: {
    marginTop: 'auto',
    gap: 1,
  },
  title: {
    fontSize: 17,
    lineHeight: 21,
    fontFamily: FONTS.semiBold,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: FONTS.regular,
  },
  pressed: {
    opacity: 0.8,
  },
  deadlineCard: {
    borderRadius: 24,
    paddingVertical: 4,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  deadlineTexts: {
    flex: 1,
  },
  deadlineTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  deadlineSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONTS.regular,
    color: c.indigo,
  },
});
