import { Image } from 'expo-image';
import type { TFunction } from 'i18next';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Fragment, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { confirmDeleteDocument } from '@/actions/delete-actions';
import { getCalendarSettings } from '@/calendar/calendar-settings';
import { CardDetail } from '@/components/card-detail';
import { DeadlineSection } from '@/components/deadline-section';
import { Group, Row } from '@/components/grouped-list';
import { IconSquare } from '@/components/icon-square';
import { PasswordCard } from '@/components/password-card';
import { PasswordDetail } from '@/components/password-detail';
import { PersonAvatar } from '@/components/person-avatar';
import { PrimaryButton } from '@/components/primary-button';
import { RoundIconButton } from '@/components/round-icon-button';
import { SecondaryButton } from '@/components/secondary-button';
import { StatusBadge } from '@/components/status-badge';
import { Switch } from '@/components/switch';
import { Text } from '@/components/text';
import { ThemedText } from '@/components/themed-text';
import { WhiteCard } from '@/components/white-card';
import { reminderLabel, reminderPickerValue } from '@/constants/deadline-options';
import { type Palette, Spacing, tintedShadow } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import {
  getDocumentDetail,
  listDocumentFiles,
  listDocumentVersions,
  setPaymentStatus,
  setPinned,
  setReminderDays,
} from '@/db/documents';
import type { DocumentDetail as Detail, DocumentFile } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useLeaveWhenDeleted } from '@/hooks/use-leave-when-deleted';
import { usePressed } from '@/hooks/use-pressed';
import { usePreferences } from '@/settings/preferences';
import { resolveDocumentFile } from '@/storage/document-files';
import { categoryShadowRgb, categoryTint } from '@/utils/colors';
import { parseISODate, toISODate } from '@/utils/dates';
import { daysUntil } from '@/utils/deadlines';
import { dayAndMonth, folderDate } from '@/utils/folder';
import { PIN_TINT } from '@/constants/brand';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useFormat } from '@/i18n/use-format';

const PIN_BACKGROUND = (p: Palette) => PIN_TINT(p);
const PIN_COLOR = (p: Palette) => p.heart;

// Detail of one document (or of a card). Used by the document/[id] screen of every tab.
export default function DocumentDetail() {
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: document } = useDbQuery((db) => getDocumentDetail(db, Number(id)), [id]);
  const { data: files } = useDbQuery((db) => listDocumentFiles(db, Number(id)), [id]);
  const db = useSQLiteContext();

  // Deleted with "Cancella" → leave this screen
  useLeaveWhenDeleted(document);

  // undefined = still loading (a few milliseconds), null = not in the database
  if (document === undefined) return <Stack.Screen options={{ title: '' }} />;
  if (document === null) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: '' }} />
        <ThemedText themeColor="textSecondary">{t('documentDetail.notFound')}</ThemedText>
      </View>
    );
  }

  const pin = { pinned: document.isPinned, onToggle: () => setPinned(db, document.id, !document.isPinned) };

  // Cards have their own screen: the card, its barcode on white, full brightness
  if (document.category.isCards) {
    return files ? <CardDetail card={document} files={files} pin={pin} /> : <Stack.Screen options={{ title: '' }} />;
  }

  // Password entries: their own screen in the style of Nuova password
  if (document.category.isPassword) {
    return (
      <>
        <Stack.Screen options={{ title: document.title, headerShown: false }} />
        <PasswordDetail document={document} />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: document.title, headerShown: false }} />
      {files && <DocumentScreen document={document} files={files} onTogglePin={pin.onToggle} />}
    </>
  );
}

// "1 pagina", "PDF", "3 pagine"
function filesLabel(files: DocumentFile[], t: TFunction): string {
  if (files.some((f) => f.kind === 'pdf')) return 'PDF';
  const pages = files.filter((f) => f.kind === 'image').length;
  if (pages === 0) return t('documentDetail.noPages');
  return t('documentDetail.photoPages', { count: pages });
}

// The document (docs/design/Documento.dc.html): back button on the category tint, the preview
// (tap → Visualizza), name and "Novembre 2026 · PDF", the actions (Visualizza, Invia, Preferiti,
// Modifica, Cancella), DETTAGLI, "Ricordamelo" and "Segna come pagata".
// Our extras, where they belong: Aggiungi pagine and Rinnovato among the actions; Stato, Persona,
// Numero, Note and the calendar in DETTAGLI; the Scadenza section (date, Si ripete, Promemoria);
// the Password card; the previous versions.
function DocumentScreen({
  document,
  files,
  onTogglePin,
}: {
  document: Detail;
  files: DocumentFile[];
  onTogglePin: () => void;
}) {
  const { t } = useI18n();
  const fmt = useFormat();
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { defaultReminderDays } = usePreferences();
  const { data: versions } = useDbQuery((d) => listDocumentVersions(d, document.id), [document.id]);
  const { category, person } = document;
  const { tint, onTint } = categoryTint(category.colors, theme);
  const gradient = [category.colors.top, category.colors.bottom] as const;
  const shadow = tintedShadow(categoryShadowRgb(category.colors));
  const hasFiles = files.length > 0;
  const calendar = getCalendarSettings();

  const month = parseISODate(folderDate(document));
  const subtitle = `${fmt.monthTitle(month.getFullYear(), month.getMonth())} · ${filesLabel(files, t)}`;
  const days = document.expiresAt ? daysUntil(document.expiresAt) : null;
  const reminderOn = document.expiresAt !== null && document.reminderDays !== -1;
  const params = { id: String(document.id) };
  const go = (href: Href) => router.push(href);

  function toggleReminder(on: boolean) {
    if (!document.expiresAt) {
      go({ pathname: '/deadline/[id]', params }); // a reminder needs a deadline first
      return;
    }
    setReminderDays(db, document.id, on ? null : -1);
  }

  const details: { label: string; value: ReactNode }[] = [];
  if (document.amountCents !== null) {
    details.push({ label: t('documentDetail.amount'), value: <Text style={styles.amount}>{fmt.euro(document.amountCents)}</Text> });
  }
  if (document.expiresAt && days !== null) {
    const near = days <= 7;
    const distance =
      days < 0
        ? t('documentDetail.expired')
        : days === 0
          ? t('dates.today')
          : days === 1
            ? t('dates.tomorrow')
            : t('documentDetail.inDays', { count: days });
    details.push({
      label: t('documentDetail.deadline'),
      value: (
        <Text style={[styles.value, near && styles.valueAlert]}>
          {dayAndMonth(document.expiresAt)} · {distance}
        </Text>
      ),
    });
  }
  details.push({
    label: t('documentDetail.folder'),
    value: (
      <Text style={styles.value}>{document.docType ? `${category.name} › ${document.docType}` : category.name}</Text>
    ),
  });
  if (document.paymentStatus) {
    details.push({ label: t('documentDetail.status'), value: <StatusBadge status={document.paymentStatus} /> });
  }
  if (person) {
    details.push({
      label: t('documentDetail.person'),
      value: (
        <View style={styles.person}>
          <PersonAvatar name={person.name} photoPath={person.photoPath} size={26} />
          <Text style={styles.value}>{person.name}</Text>
        </View>
      ),
    });
  }
  if (document.number)
    details.push({
      label: t('documentDetail.number'),
      value: (
        <Text style={styles.value} selectable>
          {document.number}
        </Text>
      ),
    });
  if (document.notes) details.push({ label: t('documentDetail.notes'), value: <Text style={styles.value}>{document.notes}</Text> });
  if (calendar.enabled && document.calendarEventId && calendar.calendarTitle) {
    details.push({ label: t('documentDetail.inCalendar'), value: <Text style={styles.value}>{calendar.calendarTitle}</Text> });
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 110 }]}>
      <RoundIconButton
        symbol="chevron.left"
        accessibilityLabel={t('common.back')}
        background={tint}
        color={theme.text}
        onPress={() => router.back()}
      />

      <Preview
        document={document}
        files={files}
        tint={tint}
        onPress={hasFiles ? () => go({ pathname: '/view/[id]', params }) : undefined}
      />

      <Text style={styles.title} accessibilityRole="header">
        {document.title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <WhiteCard style={styles.actions}>
        {[
          hasFiles && (
            <ActionRow
              key="view"
              symbol="eye"
              label={t('documentDetail.view')}
              tint={tint}
              color={onTint}
              chevron
              onPress={() => go({ pathname: '/view/[id]', params })}
            />
          ),
          hasFiles && (
            <ActionRow
              key="send"
              symbol="square.and.arrow.up"
              label={t('common.send')}
              tint={tint}
              color={onTint}
              chevron
              onPress={() => go({ pathname: '/send', params: { ids: String(document.id) } })}
            />
          ),
          <ActionRow
            key="pin"
            symbol={document.isPinned ? 'heart.fill' : 'heart'}
            label={document.isPinned ? t('documentDetail.unpin') : t('documentDetail.pin')}
            tint={PIN_BACKGROUND(theme)}
            color={PIN_COLOR(theme)}
            selected={document.isPinned}
            onPress={onTogglePin}
          />,
          <ActionRow
            key="edit"
            symbol="pencil"
            label={t('common.edit')}
            tint={tint}
            color={onTint}
            chevron
            onPress={() => go({ pathname: '/edit-document/[id]', params })}
          />,
          <ActionRow
            key="pages"
            symbol="plus"
            label={t('documentDetail.addPages')}
            tint={tint}
            color={onTint}
            chevron
            onPress={() => go({ pathname: '/document-pages/[id]', params })}
          />,
          document.expiresAt && (
            <ActionRow
              key="renew"
              symbol="arrow.clockwise"
              label={t('documentDetail.renewed')}
              tint={tint}
              color={onTint}
              chevron
              onPress={() => go({ pathname: '/renew/[id]', params })}
            />
          ),
          <ActionRow
            key="delete"
            symbol="trash"
            label={t('documentDetail.delete')}
            tint={theme.errorBackground}
            color={theme.error}
            destructive
            onPress={() => confirmDeleteDocument(document)}
          />,
        ]
          .filter(Boolean)
          .map((row, index) => (
            <Fragment key={index}>
              {index > 0 && <View style={styles.separator} />}
              {row}
            </Fragment>
          ))}
      </WhiteCard>

      <Text style={styles.sectionTitle} accessibilityRole="header">
        {t('documentDetail.details')}
      </Text>
      <WhiteCard style={styles.details}>
        {details.map((detail, index) => (
          <View key={detail.label} style={[styles.detailRow, index < details.length - 1 && styles.detailBorder]}>
            <Text style={styles.detailLabel}>{detail.label}</Text>
            <View style={styles.detailValue}>{detail.value}</View>
          </View>
        ))}
      </WhiteCard>

      <WhiteCard style={styles.reminder}>
        <IconSquare symbol="bell" colors={category.colors} size={40} shadow />
        <View style={styles.reminderTexts}>
          <Text style={styles.reminderTitle}>{t('documentDetail.remindMe')}</Text>
          <Text style={styles.reminderText}>
            {!document.expiresAt
              ? t('documentDetail.reminderNeedsDeadline')
              : reminderOn
                ? t('documentDetail.reminderWhen', {
                    when: reminderLabel(reminderPickerValue(document.reminderDays), defaultReminderDays),
                  })
                : t('documentDetail.noReminder')}
          </Text>
        </View>
        <Switch
          value={reminderOn}
          onValueChange={toggleReminder}
          gradient={gradient}
          accessibilityLabel={t('documentDetail.remindMe')}
        />
      </WhiteCard>

      {/* Always here: "Aggiungi scadenza", or the deadline to change or remove */}
      <View style={styles.extra}>
        <DeadlineSection document={document} />
      </View>

      {category.isPassword && (
        <View style={styles.extra}>
          <PasswordCard documentId={document.id} username={document.username} />
        </View>
      )}

      {/* The pages it had before each "Rinnovato" with a new scan */}
      {versions && versions.length > 0 && (
        <View style={styles.extra}>
          <Group title={t('documentDetail.previousVersions')}>
            {versions.map((version, index) => (
              <Row
                key={version.id}
                first={index === 0}
                symbol="clock.arrow.circlepath"
                label={t('documentDetail.versionUntil', { date: fmt.date(toISODate(new Date(version.archivedAt))) })}
                value={version.expiresAt ? t('documentDetail.versionExpired', { date: fmt.date(version.expiresAt) }) : undefined}
                onPress={() => router.push({ pathname: '/document-version/[id]', params: { id: String(version.id) } })}
              />
            ))}
          </Group>
        </View>
      )}

      {/* "Segna come pagata": for what is to be paid (a status, an amount, or a bill) */}
      {document.paymentStatus === 'paid' ? (
        <View style={styles.pay}>
          <SecondaryButton
            label={
              document.paidAt
                ? t('documentDetail.paidOnMarkDue', { date: dayAndMonth(document.paidAt) })
                : t('documentDetail.markDue')
            }
            symbol="arrow.uturn.backward"
            background={tint}
            color={onTint}
            onPress={() => setPaymentStatus(db, document.id, 'due')}
          />
        </View>
      ) : (
        (document.paymentStatus === 'due' || document.amountCents !== null || category.builtinKey === 'lightbulb') && (
          <View style={styles.pay}>
            <PrimaryButton
              label={t('documentDetail.markPaid')}
              symbol="checkmark"
              gradient={gradient}
              shadow={shadow}
              onPress={() => setPaymentStatus(db, document.id, 'paid')}
            />
          </View>
        )
      )}
    </ScrollView>
  );
}

// The 220-high box on the category tint with the first page slightly rotated, and "1 di N"
function Preview({
  document,
  files,
  tint,
  onPress,
}: {
  document: Detail;
  files: DocumentFile[];
  tint: string;
  onPress?: () => void;
}) {
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const { pressed, handlers } = usePressed();
  const images = files.filter((f) => f.kind === 'image');
  const pdf = files.some((f) => f.kind === 'pdf');
  const first = images[0];
  const count = pdf ? null : images.length;

  return (
    <Pressable
      {...handlers}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={onPress ? t('documentDetail.view') : t('documentDetail.noPages')}
      style={[styles.preview, { backgroundColor: tint }, pressed && styles.pressed]}>
      <View style={styles.page}>
        {first ? (
          <Image source={{ uri: resolveDocumentFile(first.path).uri }} style={styles.pageImage} contentFit="cover" />
        ) : (
          <View style={styles.pageEmpty}>
            <SymbolView
              name={pdf ? 'doc.richtext' : document.category.symbol}
              tintColor={document.category.colors.bottom}
              size={40}
            />
            {/* i18n-ignore */}
            {pdf && <Text style={styles.pdfLabel}>PDF</Text>}
          </View>
        )}
      </View>
      {count !== null && count > 1 && (
        <View style={styles.pageCount}>
          <Text style={styles.pageCountText}>{t('documentDetail.firstOf', { total: count })}</Text>
        </View>
      )}
    </Pressable>
  );
}

type ActionRowProps = {
  symbol: SFSymbol;
  label: string;
  tint: string;
  color: string;
  onPress: () => void;
  chevron?: boolean;
  destructive?: boolean;
  selected?: boolean;
};

// One action: 40pt square on the tint, label 16/500, chevron when it opens a screen
function ActionRow({
  symbol,
  label,
  tint,
  color,
  onPress,
  chevron = false,
  destructive = false,
  selected,
}: ActionRowProps) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { pressed, handlers } = usePressed();
  return (
    <Pressable
      {...handlers}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={selected === undefined ? undefined : { selected }}
      style={[styles.actionRow, pressed && styles.actionPressed]}>
      <View style={[styles.actionIcon, { backgroundColor: tint }]}>
        <SymbolView name={symbol} tintColor={color} size={20} />
      </View>
      <Text style={[styles.actionLabel, destructive && { color: theme.error }]}>{label}</Text>
      {chevron && (
        <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={16} weight="semibold" />
      )}
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    paddingHorizontal: Spacing.side,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    marginTop: 18,
    height: 220,
    borderRadius: 24,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  page: {
    width: 146,
    height: 186,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 10px 26px rgba(28, 30, 70, 0.12)',
    transform: [{ rotate: '-2deg' }],
    overflow: 'hidden',
  },
  pageImage: {
    flex: 1,
  },
  pageEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pdfLabel: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: c.textSecondary,
  },
  pageCount: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: c.surface,
  },
  pageCountText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  title: {
    marginTop: 20,
    fontSize: 28,
    lineHeight: 34,
    fontFamily: FONTS.bold,
    color: c.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  actions: {
    marginTop: 18,
    paddingVertical: 4,
  },
  separator: {
    height: 1,
    marginLeft: 70,
    marginRight: 16,
    backgroundColor: c.separator,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionPressed: {
    backgroundColor: c.paleLilac,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: c.text,
  },
  sectionTitle: {
    marginTop: 26,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: c.textSecondary,
  },
  details: {
    marginTop: 12,
    paddingVertical: 4,
    paddingHorizontal: 18,
  },
  detailRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 10,
  },
  detailBorder: {
    borderBottomWidth: 1,
    borderBottomColor: c.separator,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  detailValue: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
  value: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: c.text,
    textAlign: 'right',
  },
  valueAlert: {
    color: c.error,
  },
  amount: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: c.text,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reminder: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  reminderTexts: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  reminderText: {
    marginTop: 1,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  extra: {
    marginTop: 18,
  },
  pay: {
    marginTop: 18,
  },
});
