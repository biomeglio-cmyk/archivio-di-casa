import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { announce } from '@/a11y/accessibility';
import { FrontBackComposer, type FrontBackComposerHandle } from '@/components/front-back-composer';
import { Segmented } from '@/components/segmented';
import { Switch } from '@/components/switch';
import { Text } from '@/components/text';
import { BRAND_GRADIENT, GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { onSoftTint, type Palette, softTint, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { useDbQuery } from '@/hooks/use-db-query';
import { useI18n } from '@/i18n';
import { copyToClipboard, emailFiles, printFiles, saveToFiles, shareFiles } from '@/send/deliver';
import { resolveDocumentFile } from '@/storage/document-files';
import { categoryTint } from '@/utils/colors';
import { usesFrontBack } from '@/utils/page-labels';
import { fileBaseName } from '@/send/file-name';
import { imageSize } from '@/send/images';
import { loadSendItems, type SendItem } from '@/send/load';
import { prepareSend, type PreparedSend, type SendFormat } from '@/send/prepare';
import {
  formatBytes,
  loadSendPreferences,
  saveSendPreferences,
  SIZE_LIMITS,
  sizeLimitLabel,
  type SendPreferences,
} from '@/send/send-preferences';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

// Warnings: soft orange box, dark orange text
const WARNING_COLORS = (p: Palette) => ({ text: onSoftTint(p, '#B35400', '#FFB48A'), background: softTint(p, '#FFF1E0', '#3A2418') });

// Sheet "Invia" (docs/design/Invia.dc.html): /send?ids=12 for one document, /send?ids=3,7,9&label=…
// for several. The document with "PDF unico · 2 pagine · 1,2 MB", PDF / Foto, then Email, WhatsApp,
// Stampa, Salva in File, Copia, Altro, "Includi la nota del documento" and Annulla. On top of our
// send engine: the files are prepared (and compressed) as before; our extras stay below the
// actions (front and back together, Peso massimo, the files that will go, warnings).
export default function SendSheet() {
  const { ids, label } = useLocalSearchParams<{ ids: string; label?: string }>();
  const { data: items } = useDbQuery((db) => loadSendItems(db, ids.split(',').map(Number)), [ids]);

  // The form reads its documents once, so it waits for them
  if (!items) return null;
  return <SendForm items={items} label={label ?? null} />;
}

type Result = { key: string; prepared?: PreparedSend; error?: string };

type DeliverAction = 'email' | 'whatsapp' | 'print' | 'save' | 'copy' | 'other';

// The six actions of the design, in its colors (labels: send.actions.<key>)
const ACTIONS: {
  key: DeliverAction;
  symbol: SFSymbol;
  gradient?: readonly [string, string];
  shadow?: string;
}[] = [
  { key: 'email', symbol: 'envelope', gradient: BRAND_GRADIENT, shadow: '100, 90, 235' },
  { key: 'whatsapp', symbol: 'message', gradient: ['#3DD37A', '#1FA855'], shadow: '31, 168, 85' },
  { key: 'print', symbol: 'printer', gradient: ['#A9AFC4', '#6E7591'], shadow: '110, 117, 145' },
  { key: 'save', symbol: 'folder', gradient: ['#86B4F7', '#6494EE'], shadow: '100, 148, 238' },
  { key: 'copy', symbol: 'doc.on.doc', gradient: ['#FFA36E', '#F5824A'], shadow: '245, 130, 74' },
  { key: 'other', symbol: 'ellipsis' },
];

function SendForm({ items, label }: { items: SendItem[]; label: string | null }) {
  const theme = useTheme();
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const large = useWindowDimensions().fontScale > 1.3; // larger text: names and labels wrap
  const composerRef = useRef<FrontBackComposerHandle>(null);
  const [preferences, setPreferences] = useState<SendPreferences>(loadSendPreferences);
  const [result, setResult] = useState<Result | null>(null);
  const [aspects, setAspects] = useState<{ front: number; back: number } | null>(null);
  const [delivering, setDelivering] = useState(false);
  const [includeNote, setIncludeNote] = useState(false);

  const single = items.length === 1 ? items[0] : null;
  const importedPdf = Boolean(single?.hasPdf);
  const multi = items.length > 1;
  // "Fronte e retro" exists only for an ID or a card with exactly 2 photos; anything else is pages
  const twoFaces = Boolean(single && usesFrontBack(single.category, single.faces));
  const skipped = multi ? items.filter((i) => i.faces === 0).length : 0;

  // What the sheet actually allows for these documents
  const format: SendFormat = multi || importedPdf ? 'pdf' : preferences.format;
  const together = multi ? true : preferences.together;
  const limit = importedPdf ? SIZE_LIMITS[0] : (SIZE_LIMITS.find((l) => l.key === preferences.limit) ?? SIZE_LIMITS[1]);
  const needsComposer = Boolean(single && twoFaces && format === 'jpeg' && together);

  const title = single ? single.title : t('common.documents', { count: items.length });
  const baseName = single ? fileBaseName([single.title, single.personName]) : fileBaseName([t('send.fileNameSeveral'), label]);
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

  const notes = includeNote ? (single?.notes?.trim() || null) : null;
  const copyText = [title, notes].filter(Boolean).join('\n\n'); // "Copia" of a PDF

  // Runs one of the six actions on the prepared files
  async function deliver(action: DeliverAction) {
    const prepared = result?.prepared;
    if (!prepared || busy) return;
    setDelivering(true);
    try {
      if (action === 'email') {
        if (!(await emailFiles(prepared.files, title, notes))) await shareFiles(prepared.files, title, notes);
      } else if (action === 'whatsapp' || action === 'other') {
        // WhatsApp: the iOS share sheet, where WhatsApp is one of the apps (Expo Go can't open it directly)
        await shareFiles(prepared.files, title, notes);
      } else if (action === 'print') {
        await printFiles(prepared.files);
      } else if (action === 'save') {
        if (await saveToFiles(prepared.files)) Alert.alert(t('send.alerts.savedToFiles'), prepared.files.map((f) => f.name).join('\n'));
      } else {
        const copied = await copyToClipboard(prepared.files, copyText);
        Alert.alert(
          copied === 'image' ? t('send.alerts.imageCopied') : t('send.alerts.textCopied'),
          copied === 'image'
            ? prepared.files.length > 1
              ? t('send.alerts.firstPageCopied')
              : t('send.alerts.pasteImage')
            : t('send.alerts.pdfNotCopied'),
        );
      }
    } catch (error) {
      Alert.alert(t('send.alerts.failed'), error instanceof Error ? error.message : String(error));
    } finally {
      setDelivering(false);
    }
  }

  const prepared = !busy ? result?.prepared : undefined;
  const error = !busy ? result?.error : undefined;
  const meta = prepared
    ? [
        format === 'pdf'
          ? prepared.files.length > 1
            ? t('send.meta.pdfs', { count: prepared.files.length })
            : t('send.meta.singlePdf')
          : t('common.photos', { count: prepared.files.length }),
        prepared.pages !== null ? t('common.pages', { count: prepared.pages }) : null,
        formatBytes(prepared.bytes),
      ]
        .filter(Boolean)
        .join(' · ')
    : error
      ? t('send.meta.failed')
      : t('send.meta.preparing');
  const ready = Boolean(prepared) && !delivering;

  // VoiceOver: the files are ready ("PDF unico · 2 pagine · 1,2 MB"), or why they are not
  useEffect(() => {
    if (busy) return;
    announce(prepared ? t('a11y.send.ready', { meta }) : error);
  }, [busy, prepared, error, meta, t]);
  const firstPhoto = single?.files.find((f) => f.kind === 'image');
  const { tint, onTint } = single ? categoryTint(single.category.colors, theme) : { tint: theme.lilac, onTint: theme.indigo };

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.head}>
        <View
          style={[styles.thumb, { backgroundColor: tint }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          {firstPhoto ? (
            <Image source={{ uri: resolveDocumentFile(firstPhoto.path).uri }} style={styles.thumbPhoto} contentFit="cover" />
          ) : (
            <View style={styles.miniPage}>
              <View style={[styles.miniTitle, { backgroundColor: onTint }]} />
              <View style={styles.miniLine} />
              <View style={[styles.miniLine, styles.miniShort]} />
            </View>
          )}
        </View>
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={large ? undefined : 2} accessibilityRole="header">
            {t('send.title', { title })}
          </Text>
          <View style={styles.metaRow} accessible accessibilityLabel={meta} accessibilityState={{ busy }}>
            {busy && <ActivityIndicator size="small" />}
            <Text style={styles.meta} numberOfLines={large ? undefined : 1}>
              {meta}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.format}>
        <Segmented
          accessibilityLabel={t('a11y.segmented.format')}
          values={['PDF', t('send.formatPhotos')]}
          selectedIndex={format === 'pdf' ? 0 : 1}
          enabled={!multi && !importedPdf}
          onChange={(index) => update({ format: index === 0 ? 'pdf' : 'jpeg' })}
        />
      </View>

      <View style={styles.actions}>
        {ACTIONS.map((action) => (
          <Pressable
            key={action.key}
            onPress={() => deliver(action.key)}
            disabled={!ready}
            accessibilityRole="button"
            accessibilityState={{ disabled: !ready }}
            style={({ pressed }) => [styles.action, large && styles.actionLarge, (pressed || !ready) && styles.dimmed]}>
            {action.gradient ? (
              <LinearGradient
                colors={action.gradient}
                start={GRADIENT_START}
                end={GRADIENT_END}
                style={[styles.actionIcon, { boxShadow: `0 8px 16px rgba(${action.shadow}, 0.30)` }]}>
                <SymbolView name={action.symbol} tintColor="#FFFFFF" size={26} />
              </LinearGradient>
            ) : (
              <View style={[styles.actionIcon, { backgroundColor: theme.lilac }]}>
                <SymbolView name={action.symbol} tintColor={theme.indigo} size={26} />
              </View>
            )}
            <Text
              style={styles.actionLabel}
              numberOfLines={large ? 2 : 1}
              adjustsFontSizeToFit={!large}
              minimumFontScale={0.8}>
              {t(`send.actions.${action.key}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <SwitchRow
        label={t('send.includeNote')}
        value={includeNote}
        onValueChange={setIncludeNote}
        disabled={!single?.notes}
      />
      {single && !single.notes && <Text style={styles.small}>{t('send.noNote')}</Text>}

      {/* Our extras: front and back together, the weight limit, the files that will go */}
      {single && twoFaces && (
        <SwitchRow
          label={format === 'pdf' ? t('send.frontBackPage') : t('send.frontBackImage')}
          value={together}
          onValueChange={(value) => update({ together: value })}
        />
      )}

      <Text style={styles.section} accessibilityRole="header">
        {t('send.maxSize')}
      </Text>
      <Segmented
        accessibilityLabel={t('send.maxSize')}
        values={SIZE_LIMITS.map(sizeLimitLabel)}
        selectedIndex={SIZE_LIMITS.indexOf(limit)}
        enabled={!importedPdf}
        onChange={(index) => update({ limit: SIZE_LIMITS[index].key })}
      />
      {importedPdf && <Text style={styles.small}>{t('send.pdfAsIs')}</Text>}
      {multi && (
        <Text style={styles.small}>{t('send.severalInfo')}</Text>
      )}

      {prepared && (
        <View style={styles.files}>
          {prepared.files.map((file) => (
            // One element for VoiceOver: "Bolletta.pdf, 1,2 MB"
            <View
              key={file.name}
              style={styles.fileRow}
              accessible
              accessibilityLabel={`${file.name}, ${formatBytes(file.bytes)}`}>
              <SymbolView name={format === 'pdf' ? 'doc.richtext' : 'photo'} tintColor={theme.indigo} size={20} />
              <Text style={styles.fileName} numberOfLines={large ? undefined : 1}>
                {file.name}
              </Text>
              <Text style={styles.small}>{formatBytes(file.bytes)}</Text>
            </View>
          ))}
          <Text style={styles.small}>{t(`send.quality.${prepared.quality}`)}</Text>
        </View>
      )}

      {error && <Warning text={error} />}
      {prepared?.warnings.map((warning) => <Warning key={warning} text={warning} />)}
      {skipped > 0 && (
        <Warning
          text={t('send.skipped', { count: skipped })}
        />
      )}

      <Pressable onPress={() => router.back()} accessibilityRole="button" style={({ pressed }) => [styles.cancel, pressed && styles.dimmed]}>
        <Text style={styles.cancelText}>{t('common.cancel')}</Text>
      </Pressable>

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

// A row with a switch, read by VoiceOver as one switch (the whole row toggles it)
function SwitchRow({ label, value, onValueChange, disabled = false }: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      style={styles.noteRow}>
      <Text style={styles.noteLabel}>{label}</Text>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
      </View>
    </Pressable>
  );
}

function Warning({ text }: { text: string }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.warning} accessible accessibilityLabel={text}>
      <SymbolView name="exclamationmark.triangle.fill" tintColor={WARNING_COLORS(theme).text} size={16} />
      <Text style={styles.warningText}>{text}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.side,
    paddingTop: 30,
  },
  flex: {
    flex: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  thumb: {
    width: 52,
    height: 66,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbPhoto: {
    width: '100%',
    height: '100%',
  },
  miniPage: {
    width: 36,
    height: 48,
    borderRadius: 4,
    padding: 5,
    gap: 3,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 3px 8px rgba(28, 30, 70, 0.12)',
  },
  miniTitle: {
    width: 14,
    height: 4,
    borderRadius: 2,
  },
  miniLine: {
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: c.separator,
  },
  miniShort: {
    width: 18,
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    flexShrink: 1,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  format: {
    marginTop: 18,
  },
  actions: {
    marginTop: 22,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 18,
  },
  action: {
    width: '25%',
    alignItems: 'center',
    gap: 8,
  },
  actionLarge: {
    width: '33.33%', // larger text: three actions a row, labels on two lines
  },
  dimmed: {
    opacity: 0.5,
  },
  actionIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: c.text,
  },
  noteRow: {
    marginTop: 22,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: c.paleLilac,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noteLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: c.text,
  },
  section: {
    marginTop: 22,
    marginBottom: 8,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: c.textSecondary,
  },
  small: {
    marginTop: 6,
    marginHorizontal: 4,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  files: {
    marginTop: 14,
    gap: 4,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: c.text,
  },
  warning: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: WARNING_COLORS(c).background,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    color: WARNING_COLORS(c).text,
  },
  cancel: {
    marginTop: 18,
    minHeight: 50,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: c.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
});
