import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { SymbolView } from 'expo-symbols';
import { useSQLiteContext } from 'expo-sqlite';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { confirmDeleteDocument } from '@/actions/delete-actions';
import { getCalendarSettings } from '@/calendar/calendar-settings';
import { CardDetail } from '@/components/card-detail';
import { DetailActionBar } from '@/components/detail-action-bar';
import { DocumentActions } from '@/components/document-actions';
import { DocumentFilesView } from '@/components/document-files-view';
import { Group, Row } from '@/components/grouped-list';
import { PersonAvatar } from '@/components/person-avatar';
import { PasswordCard } from '@/components/password-card';
import { PinHeart } from '@/components/pin-heart';
import { ThemedText } from '@/components/themed-text';
import { WhiteCard } from '@/components/white-card';
import { Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { getDocumentDetail, listDocumentFiles, listDocumentVersions, setPinned } from '@/db/documents';
import { useDbQuery } from '@/hooks/use-db-query';
import { useLeaveWhenDeleted } from '@/hooks/use-leave-when-deleted';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, toISODate } from '@/utils/dates';
import { describeRepeat } from '@/utils/recurrence';

// Detail of one document (or of a card). Used by the document/[id] screen of every tab.
export default function DocumentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { data: document } = useDbQuery((db) => getDocumentDetail(db, Number(id)), [id]);
  const { data: files } = useDbQuery((db) => listDocumentFiles(db, Number(id)), [id]);
  const { data: versions } = useDbQuery((db) => listDocumentVersions(db, Number(id)), [id]);
  const hasFiles = files !== undefined && files.length > 0;
  const db = useSQLiteContext();

  // Deleted with "Cancella" → leave this screen
  useLeaveWhenDeleted(document);

  // undefined = still loading (a few milliseconds), null = not in the database
  if (document === undefined) {
    return <Stack.Screen options={{ title: '' }} />;
  }

  if (document === null) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: '' }} />
        <ThemedText themeColor="textSecondary">Documento non trovato.</ThemedText>
      </View>
    );
  }

  // Heart and "Aggiungi ai preferiti": the lists update by themselves (useDbQuery listens to changes)
  const pin = { pinned: document.isPinned, onToggle: () => setPinned(db, document.id, !document.isPinned) };

  // Cards have their own screen: the card, its barcode on white, full brightness
  if (document.category.isCards) {
    return files ? <CardDetail card={document} files={files} pin={pin} /> : <Stack.Screen options={{ title: '' }} />;
  }

  const { category, person } = document;
  const calendar = getCalendarSettings();

  // Label/value pairs shown under the header; missing values are skipped
  const details = [
    { label: 'Categoria', value: category.name },
    { label: 'Persona', value: person?.name },
    { label: 'Numero', value: document.number },
    { label: 'Scadenza', value: document.expiresAt ? formatDate(document.expiresAt) : null }, // none: no row
    { label: 'Ricorrenza', value: document.expiresAt && document.repeat ? describeRepeat(document.repeat) : null },
    {
      label: 'Promemoria',
      value: document.expiresAt && document.reminderDays ? `${document.reminderDays} giorni prima` : null,
    },
    { label: 'Note', value: document.notes },
    {
      label: 'Nel calendario',
      value: calendar.enabled && document.calendarEventId ? calendar.calendarTitle : null,
    },
  ].filter((d) => d.value);

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: '' }} />

        <LinearGradient colors={[category.colors.top, category.colors.bottom]} style={styles.header}>
          <SymbolView name={category.symbol} tintColor={category.colors.text} size={40} />
          <Text style={[styles.title, { color: category.colors.text }]}>{document.title}</Text>
        </LinearGradient>

        {hasFiles && (
          <>
            <DocumentFilesView title={document.title} category={category} files={files} />
            <DocumentActions documentId={document.id} title={document.title} category={category} files={files} />
          </>
        )}

        <WhiteCard style={styles.card}>
          {details.map((d, index) => (
            <View
              key={d.label}
              style={[
                styles.detailRow,
                index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.backgroundSelected },
              ]}>
              <ThemedText themeColor="textSecondary">{d.label}</ThemedText>
              {d.label === 'Persona' && person ? (
                <View style={styles.personValue}>
                  <PersonAvatar name={person.name} photoPath={person.photoPath} size={28} />
                  <ThemedText style={styles.detailValue}>{d.value}</ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.detailValue}>{d.value}</ThemedText>
              )}
            </View>
          ))}
        </WhiteCard>

        {category.isPassword && <PasswordCard documentId={document.id} username={document.username} />}

        {/* The pages it had before each "Rinnovato" with a new scan */}
        {versions && versions.length > 0 && (
          <Group title="Versioni precedenti">
            {versions.map((version, index) => (
              <Row
                key={version.id}
                first={index === 0}
                symbol="clock.arrow.circlepath"
                label={`Fino al ${formatDate(toISODate(new Date(version.archivedAt)))}`}
                value={version.expiresAt ? `scadeva ${formatDate(version.expiresAt)}` : undefined}
                onPress={() => router.push({ pathname: '/document-version/[id]', params: { id: String(version.id) } })}
              />
            ))}
          </Group>
        )}

        {/* Actions right after the data; they scroll with the page */}
        <DetailActionBar
          pin={pin}
          onAdd={() => router.push({ pathname: '/document-pages/[id]', params: { id: String(document.id) } })}
          onRenew={
            document.expiresAt
              ? () => router.push({ pathname: '/renew/[id]', params: { id: String(document.id) } })
              : null
          }
          onEdit={() => router.push({ pathname: '/edit-document/[id]', params: { id: String(document.id) } })}
          onDelete={() => confirmDeleteDocument(db, document)}
        />
      </ScrollView>

      <PinHeart {...pin} />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 16,
    paddingHorizontal: Spacing.side,
    paddingBottom: 48, // room at the end, so nothing ends up under the tab bar
    gap: 16,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 28,
    borderRadius: 24,
    borderCurve: 'continuous',
    gap: 16,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: FONTS.bold,
  },
  card: {
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 14,
  },
  personValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  detailValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
