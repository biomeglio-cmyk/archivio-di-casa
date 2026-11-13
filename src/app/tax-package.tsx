import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { announce } from '@/a11y/accessibility';
import { PrimaryButton } from '@/components/primary-button';
import { Choice, Group, Row } from '@/components/grouped-list';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { WhiteCard } from '@/components/white-card';
import { type Palette, Spacing } from '@/constants/theme';
import { getCategory } from '@/db/categories';
import { useDbQuery } from '@/hooks/use-db-query';
import { useI18n } from '@/i18n';
import { formatBytes, loadSendPreferences, SIZE_LIMITS, sizeLimitLabel, type SizeLimit } from '@/send/send-preferences';
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
  const { t } = useI18n();
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

  // VoiceOver: each step of the preparation ("Preparo il PDF…", "Riduco le foto…")
  useEffect(() => {
    announce(progress);
  }, [progress]);
  const limitBytes = SIZE_LIMITS.find((l) => l.key === limit)?.bytes ?? null;

  async function prepare() {
    if (!items || !category) return;
    setProgress(t('taxPackageBuilder.progressFirst'));
    try {
      const result = await buildYearPackages(items, category.name, limitBytes, setProgress);
      setProgress(null);
      const label = year === ALL_YEARS ? category.name : yearTitle(category.name, year);
      const pdfs = result.years
        .map((y) =>
          t('taxPackage.yearLine', {
            title: yearTitle(category.name, y.year),
            pages: t('common.pages', { count: y.pages }),
            size: formatBytes(y.bytes),
          }),
        )
        .join('\n');
      const notes = [
        ...result.warnings,
        result.sentApart.length > 0
          ? t('taxPackage.sentApart', { count: result.sentApart.length, titles: result.sentApart.join(', ') })
          : null,
      ].filter(Boolean);
      await deliver(result.files, label, [pdfs, ...notes].join('\n\n'));
    } catch (error) {
      setProgress(null);
      Alert.alert(t('taxPackage.alerts.prepareFailed'), error instanceof Error ? error.message : String(error));
    }
  }

  // One file: the share sheet. Several (more years, or PDFs sent apart): iOS shares one file per
  // sheet, so the ways to send them TOGETHER come first: one email with every PDF attached, or all
  // saved in one folder of File; the share sheet one after another stays as the last choice.
  async function deliver(files: PreparedFile[], label: string, summary: string) {
    if (files.length === 1) {
      Alert.alert(t('taxPackage.alerts.ready'), summary, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.share'), onPress: () => void shareFiles(files, label) },
      ]);
      return;
    }
    const choice = await chooseAction(t('taxPackage.readyMany', { count: files.length }), [
      t('taxPackage.choices.email'),
      t('taxPackage.choices.save'),
      t('taxPackage.choices.oneByOne'),
    ]);
    try {
      if (choice === 0 && !(await emailFiles(files, label, summary))) {
        Alert.alert(t('taxPackage.alerts.noMailTitle'), t('taxPackage.alerts.noMailMessage'));
      } else if (choice === 1 && (await saveToFiles(files))) {
        Alert.alert(t('taxPackage.alerts.savedToFiles'), files.map((f) => f.name).join('\n'));
      } else if (choice === 2) {
        await shareFiles(files, label);
      }
    } catch (error) {
      Alert.alert(t('taxPackage.alerts.sendFailed'), error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
          {t('taxPackage.intro', { category: category?.name ?? t('categories.builtin.tax') })}
        </ThemedText>

        <Group
          footer={
            items
              ? items.length === 0
                ? t('taxPackage.noDocuments')
                : year === ALL_YEARS && years
                  ? t('taxPackage.summaryWithYears', {
                      documents: t('common.documents', { count: items.length }),
                      photos: t('common.photos', { count: photos }),
                      pdfs: t('taxPackage.pdfs', { count: pdfs }),
                      years: t('dates.years', { count: years.length }),
                    })
                  : t('taxPackage.summary', {
                      documents: t('common.documents', { count: items.length }),
                      photos: t('common.photos', { count: photos }),
                      pdfs: t('taxPackage.pdfs', { count: pdfs }),
                    })
              : undefined
          }>
          <Row label={t('taxPackage.year')} symbol="calendar" first>
            <Choice
              title={t('taxPackage.year')}
              value={year}
              options={[ALL_YEARS, ...(years ?? [])]}
              labelFor={(y) => (y === ALL_YEARS ? t('taxPackage.allYears') : String(y))}
              onChange={setYear}
            />
          </Row>
        </Group>

        <View style={styles.group}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupTitle} accessibilityRole="header">
            {t('taxPackage.maxPhotoSize')}
          </ThemedText>
          <Segmented
            accessibilityLabel={t('taxPackage.maxPhotoSize')}
            values={SIZE_LIMITS.map(sizeLimitLabel)}
            selectedIndex={SIZE_LIMITS.findIndex((l) => l.key === limit)}
            enabled={!busy}
            onChange={(index) => setLimit(SIZE_LIMITS[index].key)}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {t('taxPackage.limitInfo')}
          </ThemedText>
        </View>

        {busy ? (
          <WhiteCard style={styles.progress} accessible accessibilityLabel={progress} accessibilityState={{ busy }}>
            <ActivityIndicator />
            <ThemedText themeColor="textSecondary">{progress}</ThemedText>
          </WhiteCard>
        ) : (
          <PrimaryButton
            label={t('taxPackage.prepare')}
            symbol="square.and.arrow.up"
            disabled={!items?.length || !category}
            onPress={prepare}
          />
        )}
      </ScrollView>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" onPress={() => router.back()}>
          {t('common.done')}
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
