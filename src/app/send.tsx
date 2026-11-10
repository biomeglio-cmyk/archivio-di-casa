import { Host, Switch } from '@expo/ui';
import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FrontBackComposer, type FrontBackComposerHandle } from '@/components/front-back-composer';
import { GradientButton } from '@/components/gradient-button';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR, FONTS } from '@/constants/brand';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { resolveDocumentFile } from '@/storage/document-files';
import { saveToFiles, shareFiles } from '@/send/deliver';
import { fileBaseName } from '@/send/file-name';
import { imageSize } from '@/send/images';
import { loadSendItems, type SendItem } from '@/send/load';
import { prepareSend, type PreparedSend, type SendFormat } from '@/send/prepare';
import {
  formatBytes,
  loadSendPreferences,
  saveSendPreferences,
  SIZE_LIMITS,
  type SendPreferences,
} from '@/send/send-preferences';

const WARNING_TEXT = '#B35400';
const WARNING_BACKGROUND = '#FFF1E0';

// Sheet "Invia": /send?ids=12 for one document, /send?ids=3,7,9&label=Step for several
export default function SendSheet() {
  const { ids, label } = useLocalSearchParams<{ ids: string; label?: string }>();
  const { data: items } = useDbQuery((db) => loadSendItems(db, ids.split(',').map(Number)), [ids]);

  // The form reads its documents once, so it waits for them
  if (!items) return null;
  return <SendForm items={items} label={label ?? null} />;
}

type Result = { key: string; prepared?: PreparedSend; error?: string };

function SendForm({ items, label }: { items: SendItem[]; label: string | null }) {
  const theme = useTheme();
  const composerRef = useRef<FrontBackComposerHandle>(null);
  const [preferences, setPreferences] = useState<SendPreferences>(loadSendPreferences);
  const [result, setResult] = useState<Result | null>(null);
  const [aspects, setAspects] = useState<{ front: number; back: number } | null>(null);
  const [delivering, setDelivering] = useState(false);

  const single = items.length === 1 ? items[0] : null;
  const importedPdf = Boolean(single?.hasPdf);
  const multi = items.length > 1;
  const twoFaces = single?.faces === 2;
  const skipped = multi ? items.filter((i) => i.faces === 0).length : 0;

  // What the sheet actually allows for these documents
  const format: SendFormat = multi || importedPdf ? 'pdf' : preferences.format;
  const together = multi ? true : preferences.together;
  const limit = importedPdf ? SIZE_LIMITS[0] : (SIZE_LIMITS.find((l) => l.key === preferences.limit) ?? SIZE_LIMITS[1]);
  const needsComposer = Boolean(single && twoFaces && format === 'jpeg' && together);

  const title = single ? single.title : `${items.length} documenti`;
  const baseName = single ? fileBaseName([single.title, single.personName]) : fileBaseName(['documenti', label]);
  const front = single?.files.find((f) => f.kind === 'image' && f.side !== 'back');
  const back = single?.files.find((f) => f.kind === 'image' && f.side === 'back');

  // Real proportions of the two faces, for the off-screen composer (only for one combined JPEG)
  useEffect(() => {
    if (!front || !back) return;
    let active = true;
    Promise.all([imageSize(resolveDocumentFile(front.path).uri), imageSize(resolveDocumentFile(back.path).uri)]).then(
      ([f, b]) => active && setAspects({ front: f.width / f.height, back: b.width / b.height }),
      () => active && setAspects({ front: 1.585, back: 1.585 }),
    );
    return () => {
      active = false;
    };
  }, [front, back]);

  // Re-prepare the files whenever an option changes. `busy` is derived: the shown result
  // belongs to other options until the new one arrives (no setState at the start of the effect).
  const key = JSON.stringify({ format, together, limit: limit.key });
  const busy = result?.key !== key;
  useEffect(() => {
    if (needsComposer && !aspects) return; // the composer needs the real proportions first
    let active = true;
    prepareSend(
      items,
      { format, together, limitBytes: limit.bytes },
      baseName,
      needsComposer ? (options) => composerRef.current!.compose(options) : null,
    ).then(
      (prepared) => active && setResult({ key, prepared }),
      (error: unknown) => active && setResult({ key, error: error instanceof Error ? error.message : String(error) }),
    );
    return () => {
      active = false;
    };
  }, [key, items, format, together, limit.bytes, baseName, needsComposer, aspects]);

  function update(change: Partial<SendPreferences>) {
    const next = { ...preferences, ...change };
    saveSendPreferences(next);
    setPreferences(next);
  }

  async function deliver(action: 'share' | 'save') {
    const prepared = result?.prepared;
    if (!prepared || busy) return;
    setDelivering(true);
    try {
      if (action === 'share') {
        await shareFiles(prepared.files, title);
      } else if (await saveToFiles(prepared.files)) {
        Alert.alert('Salvato in File', prepared.files.map((f) => f.name).join('\n'));
      }
    } catch (error) {
      Alert.alert('Impossibile completare', error instanceof Error ? error.message : String(error));
    } finally {
      setDelivering(false);
    }
  }

  const prepared = !busy ? result?.prepared : undefined;
  const error = !busy ? result?.error : undefined;
  const line = theme.backgroundSelected;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View>
        <ThemedText style={styles.title}>Invia</ThemedText>
        <ThemedText themeColor="textSecondary" numberOfLines={1}>
          {title}
        </ThemedText>
      </View>

      <View style={styles.group}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupTitle}>
          Formato
        </ThemedText>
        <SegmentedControl
          values={['PDF', 'JPEG']}
          selectedIndex={format === 'pdf' ? 0 : 1}
          enabled={!multi && !importedPdf}
          onChange={(e) => update({ format: e.nativeEvent.selectedSegmentIndex === 0 ? 'pdf' : 'jpeg' })}
        />
        {multi && (
          <ThemedText type="small" themeColor="textSecondary">
            Un unico PDF: ogni documento su una pagina, fronte e retro insieme.
          </ThemedText>
        )}
      </View>

      {single && twoFaces && (
        <View style={[styles.card, styles.switchRow, { backgroundColor: theme.surface }]}>
          <ThemedText style={styles.flex}>
            {format === 'pdf' ? 'Fronte e retro su una pagina' : "Fronte e retro in un'immagine"}
          </ThemedText>
          <Host matchContents>
            <Switch value={together} onValueChange={(value) => update({ together: value })} />
          </Host>
        </View>
      )}

      <View style={styles.group}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupTitle}>
          Peso massimo
        </ThemedText>
        <SegmentedControl
          values={SIZE_LIMITS.map((l) => l.label)}
          selectedIndex={SIZE_LIMITS.indexOf(limit)}
          enabled={!importedPdf}
          onChange={(e) => update({ limit: SIZE_LIMITS[e.nativeEvent.selectedSegmentIndex].key })}
        />
        {importedPdf && (
          <ThemedText type="small" themeColor="textSecondary">
            Il PDF viene inviato così com&apos;è: la compressione dei PDF importati arriverà in seguito.
          </ThemedText>
        )}
      </View>

      {/* Preview of what will be sent */}
      <View style={[styles.card, styles.preview, { backgroundColor: theme.surface }]}>
        {busy && (
          <View style={styles.previewRow}>
            <ActivityIndicator />
            <ThemedText themeColor="textSecondary">Preparazione…</ThemedText>
          </View>
        )}
        {error && <ThemedText style={{ color: WARNING_TEXT }}>{error}</ThemedText>}
        {prepared &&
          prepared.files.map((file, index) => (
            <View
              key={file.name}
              style={[styles.previewRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: line }]}>
              <SymbolView name={format === 'pdf' ? 'doc.richtext' : 'photo'} tintColor={BRAND_COLOR} size={26} />
              <View style={styles.flex}>
                <ThemedText numberOfLines={1}>{file.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {[
                    prepared.pages !== null ? (prepared.pages === 1 ? '1 pagina' : `${prepared.pages} pagine`) : null,
                    formatBytes(file.bytes),
                    `Qualità ${prepared.quality.toLowerCase()}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </ThemedText>
              </View>
            </View>
          ))}
        {prepared && prepared.files.length > 1 && (
          <ThemedText type="small" themeColor="textSecondary">
            Totale {formatBytes(prepared.bytes)} · si condividono uno dopo l&apos;altro
          </ThemedText>
        )}
      </View>

      {prepared?.warnings.map((warning) => (
        <View key={warning} style={styles.warning}>
          <SymbolView name="exclamationmark.triangle.fill" tintColor={WARNING_TEXT} size={16} />
          <Text style={styles.warningText}>{warning}</Text>
        </View>
      ))}
      {skipped > 0 && (
        <View style={styles.warning}>
          <SymbolView name="exclamationmark.triangle.fill" tintColor={WARNING_TEXT} size={16} />
          <Text style={styles.warningText}>
            {skipped === 1 ? '1 documento senza foto non è incluso' : `${skipped} documenti senza foto non sono inclusi`}{' '}
            (i PDF importati non si possono ancora unire).
          </Text>
        </View>
      )}

      <GradientButton
        label="Condividi"
        symbol="square.and.arrow.up"
        disabled={!prepared || delivering}
        onPress={() => deliver('share')}
      />
      <SecondaryButton label="Salva su File" symbol="folder" disabled={!prepared || delivering} onPress={() => deliver('save')} />

      {/* Off screen: draws front and back into one JPEG when that option is chosen */}
      {needsComposer && front && back && aspects && (
        <FrontBackComposer
          ref={composerRef}
          frontUri={resolveDocumentFile(front.path).uri}
          backUri={resolveDocumentFile(back.path).uri}
          frontAspect={aspects.front}
          backAspect={aspects.back}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 18,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: FONTS.titleBold,
  },
  group: {
    gap: 8,
  },
  groupTitle: {
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
  },
  flex: {
    flex: 1,
  },
  preview: {
    paddingVertical: 8,
    gap: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: WARNING_BACKGROUND,
  },
  warningText: {
    flex: 1,
    color: WARNING_TEXT,
    fontSize: 14,
    lineHeight: 19,
  },
});
