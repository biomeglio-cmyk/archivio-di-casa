import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { confirmDeletePerson } from '@/actions/delete-actions';
import { documentQuickActions } from '@/actions/quick-actions';
import { pickPersonPhoto } from '@/capture/pick-files';
import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { DocumentTile, DocumentTileFace } from '@/components/document-tile';
import { PersonAvatar } from '@/components/person-avatar';
import { PrimaryButton } from '@/components/primary-button';
import { RoundIconButton } from '@/components/round-icon-button';
import { SortableTileGrid } from '@/components/sortable-tile-grid';
import { Text } from '@/components/text';
import { TileGrid } from '@/components/tile-grid';
import { roleLabel } from '@/constants/person-roles';
import { Colors, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { listDocumentsByPerson, saveDocumentOrder } from '@/db/documents';
import { getPerson, setPersonPhoto } from '@/db/people';
import type { DocumentListItem, Person } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useDocumentSelection } from '@/hooks/use-document-selection';
import { useLeaveWhenDeleted } from '@/hooks/use-leave-when-deleted';
import { deletePersonPhoto, storePersonPhoto } from '@/storage/person-photos';
import { whenBelowLimit } from '@/settings/free-limit';

const TILE_HEIGHT = 132; // the document squares of the design

const documentHref = (id: number) => ({ pathname: '/(tabs)/(family)/document/[id]', params: { id: String(id) } }) as const;
const documentsLabel = (count: number) => (count === 1 ? '1 documento' : `${count} documenti`);

// "Persona" (docs/design/Persona.dc.html): back and "…" (Modifica persona / Cancella persona), the
// photo with "Cambia foto", name, "Partner · 6 documenti", "Modifica profilo", then "I SUOI DOCUMENTI"
// 2 per row and the dashed "Aggiungi documento". Our extras: long press a document to drag it or
// for its quick actions, and "Seleziona e invia" in "…" to send several as one PDF.
export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const personId = Number(id);
  const { data: person } = useDbQuery((db) => getPerson(db, personId), [personId]);
  const { data: documents } = useDbQuery((db) => listDocumentsByPerson(db, personId), [personId]);

  // Deleted with "Cancella persona" → back to Famiglia
  useLeaveWhenDeleted(person);

  return (
    <>
      <Stack.Screen options={{ title: person?.name ?? '', headerShown: false }} />
      {person && documents && <PersonContent person={person} documents={documents} />}
    </>
  );
}

function PersonContent({ person, documents }: { person: Person; documents: DocumentListItem[] }) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const selection = useDocumentSelection();
  const [sheetOpen, setSheetOpen] = useState(false);

  const role = roleLabel(person.role);
  const subtitle = [person.role === 'me' ? null : role, documentsLabel(documents.length)].filter(Boolean).join(' · ');
  const selectedIds = documents.filter((d) => selection.selected.has(d.id)).map((d) => d.id);
  const edit = () => router.push({ pathname: '/person-form', params: { id: String(person.id) } });
  const addDocument = () =>
    whenBelowLimit(() => router.push({ pathname: '/new-document', params: { personId: String(person.id) } }));

  async function saveOrder(items: DocumentListItem[]) {
    try {
      await saveDocumentOrder(db, 'person', items.map((d) => d.id));
    } catch (error) {
      Alert.alert('Impossibile salvare l’ordine', error instanceof Error ? error.message : String(error));
    }
  }

  // "Cambia foto": take or choose one (or remove it); the old file goes after the database changed
  async function changePhoto() {
    let stored: string | null = null;
    try {
      const result = await pickPersonPhoto(Boolean(person.photoPath));
      if (result === null) return;
      if (result !== 'remove') stored = await storePersonPhoto(result);
      await setPersonPhoto(db, person.id, stored);
      if (person.photoPath) deletePersonPhoto(person.photoPath);
    } catch (error) {
      if (stored) deletePersonPhoto(stored);
      Alert.alert('Impossibile usare la foto', error instanceof Error ? error.message : String(error));
    }
  }

  function sendTogether() {
    router.push({ pathname: '/send', params: { ids: selectedIds.join(','), label: person.name } });
    selection.cancel();
  }

  const sheetActions: SheetAction[] = [
    { key: 'edit', label: 'Modifica persona', symbol: 'pencil', onPress: edit },
    ...(documents.some((d) => d.imageCount > 0)
      ? [{ key: 'select', label: 'Seleziona e invia', symbol: 'checkmark.circle' as const, onPress: selection.start }]
      : []),
    { key: 'delete', label: 'Cancella persona', symbol: 'trash', destructive: true, onPress: () => confirmDeletePerson(person) },
  ];

  return (
    <GestureHandlerRootView style={styles.screen}>
      <Animated.ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.page, { paddingTop: insets.top + 8, paddingBottom: Spacing.belowContent }]}>
        <View style={styles.bar}>
          <RoundIconButton symbol="chevron.left" accessibilityLabel="Indietro" color={Colors.current.text} onPress={() => router.back()} />
          {selection.selecting ? (
            <Pressable onPress={selection.cancel} accessibilityRole="button" style={styles.cancel}>
              <Text style={styles.cancelText}>Annulla</Text>
            </Pressable>
          ) : (
            <RoundIconButton
              symbol="ellipsis"
              accessibilityLabel={`Modifica o cancella ${person.name}`}
              color={Colors.current.text}
              onPress={() => setSheetOpen(true)}
            />
          )}
        </View>

        <View style={styles.profile}>
          <View style={styles.avatarBox}>
            <View style={styles.avatarRing}>
              <PersonAvatar name={person.name} photoPath={person.photoPath} size={116} />
            </View>
            <Pressable onPress={changePhoto} accessibilityRole="button" accessibilityLabel="Cambia foto" style={styles.camera}>
              <SymbolView name="camera" tintColor={Colors.current.indigo} size={16} weight="semibold" />
            </Pressable>
          </View>
          <Text style={styles.name} accessibilityRole="header">
            {person.name}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <Pressable onPress={edit} accessibilityRole="button" style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
            <Text style={styles.editText}>Modifica profilo</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>{`I suoi documenti · ${documents.length}`}</Text>
        <View style={styles.grid}>
          {selection.selecting ? (
            <TileGrid
              items={documents}
              keyFor={(document) => document.id}
              renderTile={(document, size) => (
                <DocumentTile
                  document={document}
                  size={{ ...size, minHeight: TILE_HEIGHT }}
                  href={documentHref(document.id)}
                  selection={{
                    selected: selection.selected.has(document.id),
                    disabled: document.imageCount === 0, // only photos go into the combined PDF
                    onToggle: () => selection.toggle(document.id),
                  }}
                />
              )}
            />
          ) : (
            <SortableTileGrid
              items={documents}
              keyFor={(document) => document.id}
              labelFor={(document) => document.title}
              renderTile={(document) => <DocumentTileFace document={document} />}
              actionsFor={(document) => documentQuickActions(db, document, documentHref(document.id))}
              onOpen={(document) => router.push(documentHref(document.id))}
              onReorder={saveOrder}
              scrollableRef={scrollRef}
              add={{ label: 'Aggiungi documento', onPress: addDocument }}
              tileHeight={TILE_HEIGHT}
            />
          )}
        </View>
      </Animated.ScrollView>

      {selection.selecting && (
        <View style={[styles.sendBar, { bottom: insets.bottom + 90 }]}>
          <PrimaryButton
            label={`Invia insieme (${selectedIds.length})`}
            symbol="square.and.arrow.up"
            disabled={selectedIds.length === 0}
            onPress={sendTogether}
          />
        </View>
      )}

      <ActionSheet
        visible={sheetOpen}
        title={person.name}
        subtitle={subtitle}
        actions={sheetActions}
        onClose={() => setSheetOpen(false)}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.current.background,
  },
  page: {
    paddingHorizontal: Spacing.side,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancel: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    justifyContent: 'center',
    backgroundColor: Colors.current.lilac,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: Colors.current.indigo,
  },
  profile: {
    marginTop: 8,
    alignItems: 'center',
  },
  avatarBox: {
    width: 124,
    height: 124,
  },
  avatarRing: {
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 4,
    borderColor: Colors.current.surface,
    backgroundColor: Colors.current.surface,
    boxShadow: '0 14px 28px rgba(28, 30, 70, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    position: 'absolute',
    right: 0,
    bottom: 4,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: Colors.current.surface,
    backgroundColor: Colors.current.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    marginTop: 16,
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: Colors.current.text,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
    textAlign: 'center',
  },
  editButton: {
    marginTop: 14,
    height: 38,
    paddingHorizontal: 18,
    borderRadius: 19,
    justifyContent: 'center',
    backgroundColor: Colors.current.lilac,
  },
  editText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: Colors.current.indigo,
  },
  pressed: {
    opacity: 0.7,
  },
  section: {
    marginTop: 28,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: Colors.current.textSecondary,
  },
  grid: {
    marginTop: 12,
  },
  sendBar: {
    position: 'absolute',
    left: Spacing.side,
    right: Spacing.side,
  },
});
