import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { SymbolView } from 'expo-symbols';
import { useSQLiteContext } from 'expo-sqlite';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { confirmDeleteDocument } from '@/actions/delete-actions';
import { getCalendarSettings } from '@/calendar/calendar-settings';
import { CardDetail } from '@/components/card-detail';
import { DetailActionBar } from '@/components/detail-action-bar';
import { DocumentActions } from '@/components/document-actions';
import { DocumentFilesView } from '@/components/document-files-view';
import { PersonAvatar } from '@/components/person-avatar';
import { PinHeart } from '@/components/pin-heart';
import { ThemedText } from '@/components/themed-text';
import { useAttachFile } from '@/components/use-attach-file';
import { FONTS } from '@/constants/brand';
import { getDocumentDetail, listDocumentFiles, setPinned } from '@/db/documents';
import { useDbQuery } from '@/hooks/use-db-query';
import { useLeaveWhenDeleted } from '@/hooks/use-leave-when-deleted';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/utils/dates';

// Detail of one document (or of a card). Used by the document/[id] screen of every tab.
export default function DocumentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { data: document } = useDbQuery((db) => getDocumentDetail(db, Number(id)), [id]);
  const { data: files } = useDbQuery((db) => listDocumentFiles(db, Number(id)), [id]);
  const hasFiles = files !== undefined && files.length > 0;
  const db = useSQLiteContext();
  // "Aggiungi documento": attach a photo or a PDF to this document (hooks go before any return)
  const { attach, cameraModal } = useAttachFile(Number(id), files ?? [], document?.category);

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
    { label: 'Scadenza', value: document.expiresAt ? formatDate(document.expiresAt) : 'Nessuna' },
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

        <View style={[styles.card, { backgroundColor: theme.surface }]}>
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
        </View>

        {/* Actions right after the data; they scroll with the page */}
        <DetailActionBar
          pin={pin}
          onAdd={attach}
          onEdit={() => router.push({ pathname: '/edit-document/[id]', params: { id: String(document.id) } })}
          onDelete={() => confirmDeleteDocument(db, document)}
        />
      </ScrollView>

      <PinHeart {...pin} />
      {cameraModal}
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
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
    fontFamily: FONTS.titleBold,
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
