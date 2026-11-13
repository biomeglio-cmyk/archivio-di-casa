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
import { type Palette, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { deleteDocumentForever, listTrashedDocuments } from '@/db/documents';
import { daysLeftInTrash, emptyTrash, restoreFromTrash, TRASH_DAYS } from '@/db/trash';
import type { DocumentListItem } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { resolveDocumentFile } from '@/storage/document-files';

// "Cestino" (Menu › Altro): the deleted documents, restorable for 30 days. Each one has
// "Ripristina" and "Elimina definitivamente"; "Svuota cestino" deletes them all for good.
export default function TrashScreen() {
  const styles = useThemedStyles(makeStyles);
  const db = useSQLiteContext();
  const theme = useTheme();
  const { t } = useI18n();
  const { data: documents } = useDbQuery(listTrashedDocuments, []);

  function showError(error: unknown) {
    Alert.alert(t('trash.alerts.failed'), error instanceof Error ? error.message : String(error));
  }

  async function restore(document: DocumentListItem) {
    try {
      const { movedToOther } = await restoreFromTrash(db, document.id);
      if (movedToOther) {
        Alert.alert(
          t('trash.alerts.restoredToOther'),
          document.category.isPassword ? t('trash.alerts.restoredPassword') : t('trash.alerts.restoredMessage'),
        );
      }
    } catch (error) {
      showError(error);
    }
  }

  function deleteForever(document: DocumentListItem) {
    Alert.alert(t('trash.alerts.deleteTitle', { title: document.title }), t('trash.alerts.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => deleteDocumentForever(db, document.id).catch(showError),
      },
    ]);
  }

  function confirmEmpty() {
    const count = documents?.length ?? 0;
    Alert.alert(
      t('trash.alerts.emptyTitle'),
      t('trash.alerts.emptyMessage', { count }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('trash.alerts.emptyConfirm'), style: 'destructive', onPress: () => emptyTrash(db).catch(showError) },
      ],
    );
  }

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
          {t('trash.intro', { days: TRASH_DAYS })}
        </ThemedText>

        {documents?.length === 0 && (
          <View style={styles.empty}>
            <SymbolView name="trash" tintColor={theme.textSecondary} size={36} />
            <ThemedText themeColor="textSecondary">{t('trash.empty')}</ThemedText>
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
                        {left <= 1 ? t('trash.deletedSoon') : t('trash.deletedIn', { days: left })}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => restore(document)}
                      accessibilityRole="button"
                      accessibilityLabel={t('trash.restoreLabel', { title: document.title })}
                      hitSlop={6}
                      style={styles.action}>
                      <Text style={[styles.actionText, { color: BRAND_COLOR(theme) }]}>{t('common.restore')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => deleteForever(document)}
                      accessibilityRole="button"
                      accessibilityLabel={t('trash.deleteForeverLabel', { title: document.title })}
                      hitSlop={6}
                      style={styles.action}>
                      <Text style={[styles.actionText, { color: DANGER_COLOR(theme) }]}>{t('trash.deleteForever')}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </WhiteCard>
        )}
      </ScrollView>

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={confirmEmpty} disabled={!documents?.length} tintColor={DANGER_COLOR(theme)}>
          {t('trash.emptyTrash')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" onPress={() => router.back()}>
          {t('common.done')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

// The first photo, or the category icon on its color
function Thumbnail({ document }: { document: DocumentListItem }) {
  const styles = useThemedStyles(makeStyles);
  if (document.firstImagePath) {
    return (
      <Image source={{ uri: resolveDocumentFile(document.firstImagePath).uri }} style={styles.thumb} contentFit="cover" />
    );
  }
  return (
    <IconSquare symbol={document.category.symbol} colors={document.category.colors} size={48} />
  );
}

const makeStyles = (c: Palette) =>
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
});
