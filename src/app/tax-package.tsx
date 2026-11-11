import { Host, Picker } from '@expo/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Group, Row } from '@/components/grouped-list';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { WhiteCard } from '@/components/white-card';
import { Spacing } from '@/constants/theme';
import { getCategory } from '@/db/categories';
import { useDbQuery } from '@/hooks/use-db-query';
import { shareFiles } from '@/send/deliver';
import { formatBytes, loadSendPreferences, SIZE_LIMITS, type SizeLimit } from '@/send/send-preferences';
import { buildTaxPackage, loadTaxItems, taxYears } from '@/send/tax-package';

// Modal "Prepara per il commercialista" (menu "…" of Spese 730): pick the year, then ONE PDF with
// an index and every document of that year (photos and imported PDFs), shared with the iOS sheet.
export default function TaxPackageScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const id = Number(categoryId);
  const { data: category } = useDbQuery((db) => getCategory(db, id), [id]);
  const { data: years } = useDbQuery((db) => taxYears(db, id), [id]);
  const [year, setYear] = useState(() => new Date().getFullYear() - 1);
  const { data: items } = useDbQuery((db) => loadTaxItems(db, id, year), [id, year]);
  const [limit, setLimit] = useState<SizeLimit>(() => loadSendPreferences().limit);
  const [progress, setProgress] = useState<string | null>(null);

  const photos = items?.reduce((n, item) => n + item.files.filter((f) => f.kind === 'image').length, 0) ?? 0;
  const pdfs = items?.reduce((n, item) => n + item.files.filter((f) => f.kind === 'pdf').length, 0) ?? 0;
  const busy = progress !== null;
  const limitBytes = SIZE_LIMITS.find((l) => l.key === limit)?.bytes ?? null;

  async function prepare() {
    if (!items || !category) return;
    const title = `${category.name} ${year}`;
    setProgress('Preparo il PDF…');
    try {
      const result = await buildTaxPackage(items, title, limitBytes, setProgress);
      setProgress(null);
      const share = () => shareFiles(result.files, title);
      const summary = `${result.pages === 1 ? '1 pagina' : `${result.pages} pagine`}, ${formatBytes(result.bytes)}`;
      const notes = [
        ...result.warnings,
        result.sentApart.length > 0
          ? `${result.sentApart.length === 1 ? 'Un PDF non si può unire' : `${result.sentApart.length} PDF non si possono unire`} (protetto da password o danneggiato): ${result.sentApart.join(', ')}. Nell'indice è segnato «inviato a parte» e lo condividi subito dopo il PDF principale.`
          : null,
      ].filter(Boolean);
      if (notes.length === 0) {
        await share();
        return;
      }
      Alert.alert(`PDF pronto: ${summary}`, notes.join('\n\n'), [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Condividi', onPress: () => share() },
      ]);
    } catch (error) {
      setProgress(null);
      Alert.alert('Impossibile preparare il PDF', error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
          Un solo PDF con un indice (documento, data, persona, pagina) e tutti i documenti dell&apos;anno, in ordine di
          data: la scadenza o, se manca, il giorno in cui li hai aggiunti.
        </ThemedText>

        <Group
          footer={
            items
              ? items.length === 0
                ? 'Nessun documento in questo anno.'
                : `${items.length === 1 ? '1 documento' : `${items.length} documenti`}: ${photos} foto, ${pdfs} PDF.`
              : undefined
          }>
          <Row label="Anno" symbol="calendar" first>
            <Host matchContents>
              <Picker selectedValue={year} onValueChange={setYear}>
                {(years ?? [year]).map((y) => (
                  <Picker.Item key={y} label={String(y)} value={y} />
                ))}
              </Picker>
            </Host>
          </Row>
        </Group>

        <View style={styles.group}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupTitle}>
            Peso massimo delle foto
          </ThemedText>
          <Segmented
            values={SIZE_LIMITS.map((l) => l.label)}
            selectedIndex={SIZE_LIMITS.findIndex((l) => l.key === limit)}
            enabled={!busy}
            onChange={(index) => setLimit(SIZE_LIMITS[index].key)}
          />
          <ThemedText type="small" themeColor="textSecondary">
            Le foto vengono ridotte per stare nel limite; i PDF importati restano come sono.
          </ThemedText>
        </View>

        {busy ? (
          <WhiteCard style={styles.progress}>
            <ActivityIndicator />
            <ThemedText themeColor="textSecondary">{progress}</ThemedText>
          </WhiteCard>
        ) : (
          <PrimaryButton
            label="Prepara e condividi"
            symbol="square.and.arrow.up"
            disabled={!items?.length || !category}
            onPress={prepare}
          />
        )}
      </ScrollView>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" onPress={() => router.back()}>
          Fine
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 16,
    paddingHorizontal: Spacing.side,
    paddingBottom: 48,
    gap: 24,
  },
  intro: {
    paddingHorizontal: 4,
  },
  group: {
    gap: 8,
  },
  groupTitle: {
    paddingHorizontal: 4,
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
});
