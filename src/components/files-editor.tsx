import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, useEffectEvent, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { announce, modalAnimation, useReduceMotion } from '@/a11y/accessibility';

import { Text } from '@/components/text';
import { pickPdf, pickPhotos } from '@/capture/pick-files';
import { isScannerAvailable, scanDocument } from '@/capture/scan-document';
import { CameraCapture } from '@/components/camera-capture';
import { SecondaryButton } from '@/components/secondary-button';
import { useIconRow } from '@/components/icon-row';
import { NoBreakText } from '@/components/tile-title';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR } from '@/constants/brand';
import { FONTS } from '@/constants/typography';
import type { Category, DocumentFile, FileSide } from '@/db/types';
import { usePagesPerRow } from '@/hooks/use-large-text';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { resolveDocumentFile } from '@/storage/document-files';
import { pagesToFiles, type PendingFile } from '@/storage/pending-files';
import { chooseAction } from '@/utils/action-sheet';
import { pageLabel, usesFrontBack } from '@/utils/page-labels';
import { type Palette } from '@/constants/theme';

// A file in the form: either already saved (existing) or just captured (pending).
// The photos are kept in page order: their position in the list IS the page number.
export type EditableFile = {
  key: string;
  kind: DocumentFile['kind'];
  uri: string;
  name?: string;
  existing?: DocumentFile;
  pending?: PendingFile;
};

export function fromExisting(file: DocumentFile): EditableFile {
  return { key: `saved-${file.id}`, kind: file.kind, uri: resolveDocumentFile(file.path).uri, existing: file };
}

export function fromPending(file: PendingFile): EditableFile {
  return { key: `new-${file.uri}`, kind: file.kind, uri: file.uri, name: file.name, pending: file };
}

// Where each photo ends up when the form is saved: page = position + 1, side front/back for the
// first two (labels are decided elsewhere, by page-labels.ts)
function placementAt(index: number): { page: number; side: FileSide | null } {
  return { page: index + 1, side: index === 0 ? 'front' : index === 1 ? 'back' : null };
}

export type FilePlacement = { id: number; page: number; side: FileSide | null };

// What to write on save: new files with their page, and saved photos whose page changed
// (moved with the arrows, or shifted because another page was removed)
export function filesToSave(files: EditableFile[]): { added: PendingFile[]; moved: FilePlacement[] } {
  const added: PendingFile[] = [];
  const moved: FilePlacement[] = [];
  let index = 0;
  for (const file of files) {
    if (file.kind !== 'image') {
      if (file.pending) added.push(file.pending);
      continue;
    }
    const place = placementAt(index++);
    if (file.pending) {
      added.push({ ...file.pending, ...place });
    } else if (file.existing && (file.existing.page !== place.page || file.existing.side !== place.side)) {
      moved.push({ id: file.existing.id, ...place });
    }
  }
  return { added, moved };
}

type Props = {
  files: EditableFile[];
  category: Pick<Category, 'builtinKey'> | undefined; // "Fronte/Retro" only for IDs and cards
  onChange: (files: EditableFile[]) => void;
  autoAdd?: boolean; // "Aggiungi pagine": the Scansiona / Dalle foto choice opens by itself, once
};

// Pages of a document in "Nuovo documento" and "Modifica": thumbnails in order, each with ✕ to
// remove it and arrows to move it, then ALWAYS the big "+ Aggiungi pagina" (scanner or photos).
// A document with an imported PDF shows the PDF instead.
export function FilesEditor({ files, category, onChange, autoAdd = false }: Props) {
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const [camera, setCamera] = useState(false); // app camera, when the scanner isn't available
  const reduceMotion = useReduceMotion();
  const canScan = isScannerAvailable();

  const pdf = files.find((f) => f.kind === 'pdf');
  const images = files.filter((f) => f.kind === 'image');
  const others = files.filter((f) => f.kind !== 'image');
  const frontBack = usesFrontBack(category, images.length);
  const cardLike = usesFrontBack(category, 2); // an ID or a card: its second page is the back
  const addLabel = cardLike && images.length === 1 ? t('filesEditor.addBack') : t('filesEditor.addPage');

  function setImages(next: EditableFile[]) {
    onChange([...others, ...next]);
  }

  function append(pages: PendingFile[]) {
    setImages([...images, ...pages.map(fromPending)]);
    if (pages.length > 0) announce(t('a11y.filesEditor.added', { count: pages.length }));
  }

  function remove(key: string, name: string) {
    setImages(images.filter((f) => f.key !== key));
    announce(t('a11y.filesEditor.removed', { name }));
  }

  function move(index: number, delta: number) {
    const next = [...images];
    const [page] = next.splice(index, 1);
    next.splice(index + delta, 0, page);
    setImages(next);
    announce(t('a11y.filesEditor.movedTo', { position: index + delta + 1, total: next.length }));
  }

  function showError(error: unknown): null {
    Alert.alert(t('filesEditor.openFileFailed'), error instanceof Error ? error.message : String(error));
    return null;
  }

  // "+ Aggiungi pagina": scanner (or camera) or photos; the new pages go at the end
  async function addPages() {
    const choice = await chooseAction(addLabel, [canScan ? t('filesEditor.scan') : t('filesEditor.photograph'), t('filesEditor.fromPhotos')]);
    if (choice === 0) {
      const result = canScan ? await scanDocument() : 'unavailable';
      if (result === 'unavailable') setCamera(true);
      else if (result !== 'cancelled') append(pagesToFiles(result.pages));
    } else if (choice === 1) {
      const picked = await pickPhotos().catch(showError);
      if (picked) append(picked);
    }
  }

  // Opened from "Aggiungi pagine": ask right away, after the modal finished sliding up
  const addOnOpen = useEffectEvent(() => addPages());
  useEffect(() => {
    if (!autoAdd) return;
    const timer = setTimeout(() => addOnOpen(), 500);
    return () => clearTimeout(timer);
  }, [autoAdd]);

  // "Riscansiona tutto": a new scan replaces ALL the pages (saved ones are deleted only on save)
  async function rescan() {
    const result = await scanDocument();
    if (result === 'unavailable') {
      Alert.alert(t('filesEditor.scannerUnavailableTitle'), t('filesEditor.scannerUnavailableMessage'));
    } else if (result !== 'cancelled') {
      setImages(pagesToFiles(result.pages).map(fromPending));
      announce(t('a11y.filesEditor.added', { count: result.pages.length }));
    }
  }

  async function changePdf() {
    const picked = await pickPdf().catch(showError);
    if (picked) onChange([...files.filter((f) => f.kind !== 'pdf'), fromPending(picked[0])]);
  }

  if (pdf) {
    return (
      <View style={styles.grid}>
        <PageThumb file={pdf} label="PDF" />
        <AddTile label={t('filesEditor.replacePdf')} symbol="doc" onPress={changePdf} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* The pages in a 3-column grid (docs/design/Modifica.dc.html), the dashed tile last */}
      <View style={styles.grid}>
        {images.map((file, index) => (
          <PageThumb
            key={file.key}
            file={file}
            label={pageLabel(index, images.length, frontBack)}
            onRemove={() => remove(file.key, pageLabel(index, images.length, frontBack) ?? t('filesEditor.page'))}
            onMoveLeft={index > 0 ? () => move(index, -1) : undefined}
            onMoveRight={index < images.length - 1 ? () => move(index, 1) : undefined}
          />
        ))}
        <AddTile label={addLabel} symbol="plus" onPress={addPages} />
      </View>

      {images.length === 0 && <SecondaryButton label={t('filesEditor.importPdf')} symbol="doc" onPress={changePdf} />}

      {images.length > 0 && canScan && (
        <Pressable onPress={rescan} hitSlop={8} accessibilityRole="button" style={styles.rescan}>
          <Text style={styles.link}>{t('filesEditor.rescanAll')}</Text>
        </Pressable>
      )}

      {/* Full-screen camera above the form, when there is no scanner */}
      <Modal visible={camera} animationType={modalAnimation(reduceMotion)} presentationStyle="fullScreen">
        {camera && (
          <CameraCapture
            onDone={(uris) => {
              setCamera(false);
              append(pagesToFiles(uris));
            }}
            onCancel={() => setCamera(false)}
          />
        )}
      </Modal>
    </View>
  );
}

type ThumbProps = {
  file: EditableFile;
  label: string | null; // null = a single page: no label
  onRemove?: () => void;
  onMoveLeft?: () => void; // undefined = first page
  onMoveRight?: () => void; // undefined = last page
};

// One page: a mini sheet on lilac with ✕, its label, and ‹ › to move it. VoiceOver: the page is
// one element ("Pagina 2, nuova") with the actions Sposta prima / Sposta dopo / Togli; ✕ stays reachable.
function PageThumb({ file, label, onRemove, onMoveLeft, onMoveRight }: ThumbProps) {
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const large = fontScale > 1.3; // larger text: the caption goes above the sheet, on up to 2 lines
  const perRow = usePagesPerRow(); // the shared column rule: 3 pages per row, 2 with large text, 1 from AX1
  const name = label ?? (file.kind === 'pdf' ? 'PDF' : t('filesEditor.page'));
  const canMove = Boolean(onMoveLeft || onMoveRight);
  const isNew = Boolean(file.pending && file.kind === 'image');
  const caption = [label, isNew ? t('filesEditor.newTag') : null].filter(Boolean).join(' · ');
  const actions = [
    ...(onMoveLeft ? [{ name: 'left', label: t('filesEditor.moveBefore', { name }) }] : []),
    ...(onMoveRight ? [{ name: 'right', label: t('filesEditor.moveAfter', { name }) }] : []),
    ...(onRemove ? [{ name: 'remove', label: t('filesEditor.removePage', { name }) }] : []),
  ];

  return (
    <View style={[styles.cell, CELL_WIDTH[perRow], large && styles.cellLarge, { backgroundColor: theme.lilac }]}>
      {caption.length > 0 && (
        <ThemedText
          type="smallBold"
          themeColor="textSecondary"
          numberOfLines={large ? 2 : 1}
          style={[styles.caption, large && styles.captionLarge]}
          accessibilityElementsHidden
          importantForAccessibility="no">
          {caption}
        </ThemedText>
      )}
      <View
        style={styles.sheet}
        accessible
        accessibilityRole="image"
        accessibilityLabel={isNew ? `${name}, ${t('filesEditor.newTag')}` : name}
        accessibilityActions={actions}
        onAccessibilityAction={(event) => {
          const action = event.nativeEvent.actionName;
          if (action === 'left') onMoveLeft?.();
          else if (action === 'right') onMoveRight?.();
          else if (action === 'remove') onRemove?.();
        }}>
        {file.kind === 'image' ? (
          <Image source={{ uri: file.uri }} style={styles.sheetImage} contentFit="cover" accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.sheetImage, styles.pdfThumb]}>
            <SymbolView name="doc.richtext" tintColor={BRAND_COLOR(theme)} size={28} />
          </View>
        )}
      </View>
      {onRemove && (
        <Pressable
          onPress={onRemove}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('filesEditor.removePage', { name })}
          style={styles.remove}>
          <SymbolView name="xmark.circle.fill" tintColor={theme.textSecondary} size={22} />
        </Pressable>
      )}
      {canMove && (
        // The same moves are actions of the page for VoiceOver: the small arrows are hidden from it
        <View style={styles.arrows} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Arrow symbol="chevron.left" label={t('filesEditor.moveBefore', { name })} onPress={onMoveLeft} />
          <Arrow symbol="chevron.right" label={t('filesEditor.moveAfter', { name })} onPress={onMoveRight} />
        </View>
      )}
    </View>
  );
}

// The dashed tile at the end of the grid: "Aggiungi pagina" (or "Sostituisci PDF")
// Width of a page cell for 3, 2 or 1 per row (10 pt gaps)
const CELL_WIDTH = {
  3: { width: '31.4%' },
  2: { width: '48.4%' },
  1: { width: '100%' },
} as const;

function AddTile({ label, symbol, onPress }: { label: string; symbol: 'plus' | 'doc'; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const theme = useTheme();
  const iconRow = useIconRow(); // large text: full width, the icon and the label on one line
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.cell,
        styles.add,
        iconRow.addRow,
        { borderColor: theme.dashed },
        pressed && { backgroundColor: theme.paleLilac },
      ]}>
      <SymbolView name={symbol} tintColor={theme.textSecondary} size={22} />
      <NoBreakText style={[styles.addLabel, { color: theme.textSecondary }, iconRow.addLabel]} containerStyle={styles.addLabelBox}>
        {label}
      </NoBreakText>
    </Pressable>
  );
}

function Arrow({
  symbol,
  label,
  onPress,
}: {
  symbol: 'chevron.left' | 'chevron.right';
  label: string;
  onPress?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !onPress }}
      style={[styles.arrow, !onPress && styles.arrowDisabled]}>
      <SymbolView name={symbol} tintColor={theme.text} size={11} weight="bold" />
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  container: {
    gap: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cell: {
    // the width: CELL_WIDTH (3, 2 or 1 per row)
    minHeight: 140,
    borderRadius: 18,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    width: 74,
    height: 98,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 6px 14px rgba(28, 30, 70, 0.12)',
    overflow: 'hidden',
  },
  sheetImage: {
    flex: 1,
  },
  pdfThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellLarge: {
    justifyContent: 'flex-start',
    paddingTop: 6,
    paddingBottom: 34,
  },
  caption: {
    position: 'absolute',
    left: 8,
    top: 6,
    right: 30,
    fontSize: 12,
  },
  captionLarge: {
    position: 'relative',
    left: 0,
    top: 0,
    right: 0,
    alignSelf: 'stretch',
    marginLeft: 8,
    marginRight: 30,
    marginBottom: 6,
  },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  arrows: {
    position: 'absolute',
    bottom: 5,
    flexDirection: 'row',
    gap: 28,
  },
  arrow: {
    width: 24,
    height: 20,
    borderRadius: 10,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: {
    opacity: 0.35,
  },
  add: {
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 6,
    padding: 8,
  },
  addLabelBox: {
    flexShrink: 1,
    alignSelf: 'stretch',
  },
  addLabel: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    textAlign: 'center',
  },
  rescan: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  link: {
    color: BRAND_COLOR(c),
    fontSize: 15,
    fontFamily: FONTS.semiBold,
  },
});
