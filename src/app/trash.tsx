import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { IconSquare } from '@/components/icon-square';
import { Text } from '@/components/text';
import { ThemedText } from '@/components/themed-text';
import { WhiteCard } from '@/components/white-card';
import { BRAND_COLOR, DANGER_COLOR } from '@/constants/brand';
import { Spacing, themedStyles } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { deleteDocumentForever, listTrashedDocuments } from '@/db/documents';
import { daysLeftInTrash, emptyTrash, restoreFromTrash, TRASH_DAYS } from '@/db/trash';
import type { DocumentListItem } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { resolveDocumentFile } from '@/storage/document-files';

function showError(error: unknown) {
  Alert.alert('Operazione non riuscita', error instanceof Error ? error.message : String(error));
}

// "Cestino" (Menu › Altro): the deleted documents, restorable for 30 days. Each one has
// "Ripristina" and "Elimina definitivamente"; "Svuota cestino" deletes them all for good.
export default function TrashScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { data: documents } = useDbQuery(listTrashedDocuments, []);

  async function restore(document: DocumentListItem) {
    try {
      const { movedToOther } = await restoreFromTrash(db, document.id);
      if (movedToOther) {
        Alert.alert(
          'Ripristinato in Altro',
          document.category.isPassword
            ? 'La sua categoria non c’è più: il documento è in Altro, senza nome utente e password.'
            : 'La sua categoria non c’è più: il documento è in Altro.',
        );
      }
    } catch (error) {
      showError(error);
    }
  }

  function deleteForever(document: DocumentListItem) {
    Alert.alert(`Eliminare definitivamente "${document.title}"?`, 'Verranno eliminati anche foto e PDF. Non si può annullare.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: () => deleteDocumentForever(db, document.id).catch(showError),
      },
    ]);
  }

  function confirmEmpty() {
    const count = documents?.length ?? 0;
    Alert.alert(
      'Svuotare il cestino?',
      `${count === 1 ? 'Il documento verrà eliminato' : `I ${count} documenti verranno eliminati`} con foto e PDF. Non si può annullare.`,
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Svuota', style: 'destructive', onPress: () => emptyTrash(db).catch(showError) },
      ],
    );
  }

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
          I documenti eliminati restano qui per {TRASH_DAYS} giorni, poi vengono cancellati con foto e PDF.
        </ThemedText>

        {documents?.length === 0 && (
          <View style={styles.empty}>
            <SymbolView name="trash" tintColor={theme.textSecondary} size={36} />
            <ThemedText themeColor="textSecondary">Il cestino è vuoto</ThemedText>
          </View>
        )}

        {documents && documents.length > 0 && (
          <WhiteCard style={styles.card}>
            {documents.map((document, index) => {
              const left = document.deletedAt ? daysLeftInTrash(document.deletedAt) : TRASH_DAYS;
              return (
                <View
                  key={document.id}
                  style={[
                    styles.row,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.backgroundSelected },
                  ]}>
                  <View style={styles.info}>
                    <Thumbnail document={document} />
                    <View style={styles.texts}>
                      <ThemedText style={styles.title} numberOfLines={2}>
                        {document.title}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                        {[document.category.name, document.personName].filter(Boolean).join(' · ')}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {left <= 1 ? 'Verrà eliminato a breve' : `Verrà eliminato tra ${left} giorni`}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => restore(document)}
                      accessibilityRole="button"
                      accessibilityLabel={`Ripristina ${document.title}`}
                      hitSlop={6}
                      style={styles.action}>
                      <Text style={[styles.actionText, { color: BRAND_COLOR }]}>Ripristina</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => deleteForever(document)}
                      accessibilityRole="button"
                      accessibilityLabel={`Elimina definitivamente ${document.title}`}
                      hitSlop={6}
                      style={styles.action}>
                      <Text style={[styles.actionText, { color: DANGER_COLOR }]}>Elimina definitivamente</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </WhiteCard>
        )}
      </ScrollView>

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={confirmEmpty} disabled={!documents?.length} tintColor={DANGER_COLOR}>
          Svuota cestino
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" onPress={() => router.back()}>
          Fine
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

// The first photo, or the category icon on its color
function Thumbnail({ document }: { document: DocumentListItem }) {
  if (document.firstImagePath) {
    return (
      <Image source={{ uri: resolveDocumentFile(document.firstImagePath).uri }} style={styles.thumb} contentFit="cover" />
    );
  }
  return (
    <IconSquare symbol={document.category.symbol} colors={document.category.colors} size={48} />
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  content: {
    paddingVertical: 16,
    paddingHorizontal: Spacing.side,
    paddingBottom: 48,
    gap: 16,
  },
  intro: {
    paddingHorizontal: 4,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 48,
  },
  card: {
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
  },
  row: {
    paddingVertical: 12,
    gap: 8,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: FONTS.semiBold,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderCurve: 'continuous',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    columnGap: 20,
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 17,
  },
}));
