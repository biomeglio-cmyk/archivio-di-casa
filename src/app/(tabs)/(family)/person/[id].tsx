import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { ScrollView, StyleSheet, View } from 'react-native';

import { confirmDeletePerson } from '@/actions/delete-actions';
import { DetailActionBar } from '@/components/detail-action-bar';
import { DocumentRow } from '@/components/document-row';
import { PersonAvatar } from '@/components/person-avatar';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR } from '@/constants/brand';
import { listDocumentsByPerson } from '@/db/documents';
import { getPerson } from '@/db/people';
import { useDbQuery } from '@/hooks/use-db-query';
import { useDocumentSelection } from '@/hooks/use-document-selection';
import { useLeaveWhenDeleted } from '@/hooks/use-leave-when-deleted';

// "/person/[id]": documents of one family member. "Seleziona" picks several to send as one PDF.
export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const personId = Number(id);
  const { data: person } = useDbQuery((db) => getPerson(db, personId), [personId]);
  const { data: documents } = useDbQuery((db) => listDocumentsByPerson(db, personId), [personId]);
  const selection = useDocumentSelection();
  const db = useSQLiteContext();

  // Deleted with "Cancella" → back to Famiglia
  useLeaveWhenDeleted(person);

  // Selected documents in list order, so the PDF pages follow the list
  const selectedIds = (documents ?? []).filter((d) => selection.selected.has(d.id)).map((d) => d.id);

  function sendTogether() {
    router.push({ pathname: '/send', params: { ids: selectedIds.join(','), label: person?.name ?? '' } });
    selection.cancel();
  }

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.list}>
        <Stack.Screen options={{ title: person?.name ?? '' }} />

        {person && (
          <View style={styles.header}>
            <PersonAvatar name={person.name} photoPath={person.photoPath} size={96} />
          </View>
        )}

        {documents?.length === 0 && (
          <ThemedText themeColor="textSecondary">Nessun documento per questa persona.</ThemedText>
        )}

        {documents?.map((doc) => (
          <DocumentRow
            key={doc.id}
            document={doc}
            href={{ pathname: '/(tabs)/(family)/document/[id]', params: { id: String(doc.id) } }}
            selection={
              selection.selecting
                ? {
                    selected: selection.selected.has(doc.id),
                    disabled: doc.imageCount === 0, // only photos can go into the combined PDF
                    onToggle: () => selection.toggle(doc.id),
                  }
                : undefined
            }
          />
        ))}

        {/* Actions right after the documents; they scroll with the page. Hidden while selecting */}
        {person && !selection.selecting && (
          <DetailActionBar
            onAdd={() => router.push({ pathname: '/new-document', params: { personId: String(personId) } })}
            onEdit={() => router.push({ pathname: '/person-form', params: { id: String(personId) } })}
            onDelete={() => confirmDeletePerson(db, person)}
          />
        )}
      </ScrollView>

      {/* Header: "Seleziona", or "Annulla" while selecting */}
      <Stack.Toolbar placement="right">
        {selection.selecting ? (
          <Stack.Toolbar.Button onPress={selection.cancel}>Annulla</Stack.Toolbar.Button>
        ) : (
          <Stack.Toolbar.Button onPress={selection.start} disabled={!documents?.length}>
            Seleziona
          </Stack.Toolbar.Button>
        )}
      </Stack.Toolbar>

      {selection.selecting && (
        <Stack.Toolbar placement="bottom">
          <Stack.Toolbar.Button
            variant="prominent"
            tintColor={BRAND_COLOR}
            disabled={selectedIds.length === 0}
            onPress={sendTogether}>
            {`Invia insieme (${selectedIds.length})`}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 48, // room at the end, so nothing ends up under the tab bar
    gap: 10,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 8,
  },
});
