import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { Choice, Group, Row } from '@/components/grouped-list';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { WhiteCard } from '@/components/white-card';
import { type Palette, Spacing } from '@/constants/theme';
import { getCategory } from '@/db/categories';
import { useDbQuery } from '@/hooks/use-db-query';
import { formatBytes, loadSendPreferences, SIZE_LIMITS, type SizeLimit } from '@/send/send-preferences';
import { emailFiles, saveToFiles, shareFiles } from '@/send/deliver';
import type { PreparedFile } from '@/send/prepare';
import { buildYearPackages, loadTaxItems, taxYears, yearTitle } from '@/send/tax-package';
import { chooseAction } from '@/utils/action-sheet';
import { useThemedStyles } from '@/hooks/use-theme';

const ALL_YEARS = 0; // "Tutti gli anni"

// "Invia al commercialista" (the button of the Spese 730 folder, and its "…" menu): every document
// of the folder divided by year. "Tutti gli anni" (default) makes one PDF per year, each with its
// index and total; one year makes just that PDF. PDFs that can't be merged go along, apart.
export default function TaxPackageScreen() {
  const styles = useThemedStyles(makeStyles);
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const id = Number(categoryId);
  const { data: category } = useDbQuery((db) => getCategory(db, id), [id]);
  const { data: years } = useDbQuery((db) => taxYears(db, id), [id]);
  const [year, setYear] = useState(ALL_YEARS); // "Tutti gli anni" by default
  const { data: items } = useDbQuery((db) => loadTaxItems(db, id, year === ALL_YEARS ? null : year), [id, year]);
  const [limit, setLimit] = useState<SizeLimit>(() => loadSendPreferences().limit);
  const [progress, setProgress] = useState<string | null>(null);

  const photos = items?.reduce((n, item) => n + item.files.filter((f) => f.kind === 'image').length, 0) ?? 0;
  const pdfs = items?.reduce((n, item) => n + item.files.filter((f) => f.kind === 'pdf').length, 0) ?? 0;
  const busy = progress !== null;
  const limitBytes = SIZE_LIMITS.find((l) => l.key === limit)?.bytes ?? null;

  async function prepare() {
    if (!items || !category) return;
    setProgress('Preparo il PDF…');
    try {
      const result = await buildYearPackages(items, category.name, limitBytes, setProgress);
      setProgress(null);
      const label = year === ALL_YEARS ? category.name : yearTitle(category.name, year);
      const pdfs = result.years
        .map((y) => `${yearTitle(category.name, y.year)}: ${y.pages === 1 ? '1 pagina' : `${y.pages} pagine`}, ${formatBytes(y.bytes)}`)
        .join('\n');
      const notes = [
        ...result.warnings,
        result.sentApart.length > 0
          ? `${result.sentApart.length === 1 ? 'Un PDF non si può unire' : `${result.sentApart.length} PDF non si possono unire`} (protetto da password o danneggiato): ${result.sentApart.join(', ')}. Nell'indice è segnato «inviato a parte» e lo mandi insieme agli altri.`
          : null,
      ].filter(Boolean);
      await deliver(result.files, label, [pdfs, ...notes].join('\n\n'));
    } catch (error) {
      setProgress(null);
      Alert.alert('Impossibile preparare il PDF', error instanceof Error ? error.message : String(error));
    }
  }

  // One file: the share sheet. Several (more years, or PDFs sent apart): iOS shares one file per
  // sheet, so the ways to send them TOGETHER come first: one email with every PDF attached, or all
  // saved in one folder of File; the share sheet one after another stays as the last choice.
  async function deliver(files: PreparedFile[], label: string, summary: string) {
    if (files.length === 1) {
      Alert.alert('PDF pronto', summary, [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Condividi', onPress: () => void shareFiles(files, label) },
      ]);
      return;
    }
    const choice = await chooseAction(`${files.length} PDF pronti`, [
      'Email: tutti i PDF in un messaggio',
      'Salva in File: tutti nella stessa cartella',
      'Condividi uno alla volta',
    ]);
    try {
      if (choice === 0 && !(await emailFiles(files, label, summary))) {
        Alert.alert('Mail non configurata', 'Aggiungi un account in Mail, oppure salva i PDF in File.');
      } else if (choice === 1 && (await saveToFiles(files))) {
        Alert.alert('Salvati in File', files.map((f) => f.name).join('\n'));
      } else if (choice === 2) {
        await shareFiles(files, label);
      }
    } catch (error) {
      Alert.alert('Impossibile inviare', error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
          Tutti i documenti di {category?.name ?? 'Spese 730'}, divisi per anno: un PDF per ogni anno, con il suo indice
          (documento, data, persona, importo, pagina) e il totale. L&apos;anno è quello della scadenza o del pagamento;
          se mancano, quello in cui li hai aggiunti.
        </ThemedText>

        <Group
          footer={
            items
              ? items.length === 0
                ? 'Nessun documento in questo anno.'
                : `${items.length === 1 ? '1 documento' : `${items.length} documenti`}: ${photos} foto, ${pdfs} PDF${year === ALL_YEARS && years ? ` · ${years.length === 1 ? '1 anno' : `${years.length} anni`}` : ''}.`
              : undefined
          }>
          <Row label="Anno" symbol="calendar" first>
            <Choice
              title="Anno"
              value={year}
              options={[ALL_YEARS, ...(years ?? [])]}
              labelFor={(y) => (y === ALL_YEARS ? 'Tutti gli anni' : String(y))}
              onChange={setYear}
            />
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
            label="Prepara e invia"
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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
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
