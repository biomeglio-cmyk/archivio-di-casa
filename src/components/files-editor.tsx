import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, useEffectEvent, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { pickPdf, pickPhotos } from '@/capture/pick-files';
import { isScannerAvailable, scanDocument } from '@/capture/scan-document';
import { CameraCapture } from '@/components/camera-capture';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR, FONTS } from '@/constants/brand';
import type { Category, DocumentFile, FileSide } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { resolveDocumentFile } from '@/storage/document-files';
import { pagesToFiles, type PendingFile } from '@/storage/pending-files';
import { chooseAction } from '@/utils/action-sheet';
import { pageLabel, usesFrontBack } from '@/utils/page-labels';

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
  const [camera, setCamera] = useState(false); // app camera, when the scanner isn't available
  const canScan = isScannerAvailable();

  const pdf = files.find((f) => f.kind === 'pdf');
  const images = files.filter((f) => f.kind === 'image');
  const others = files.filter((f) => f.kind !== 'image');
  const frontBack = usesFrontBack(category, images.length);
  const cardLike = usesFrontBack(category, 2); // an ID or a card: its second page is the back
  const addLabel = cardLike && images.length === 1 ? 'Aggiungi il retro' : 'Aggiungi pagina';

  function setImages(next: EditableFile[]) {
    onChange([...others, ...next]);
  }

  function append(pages: PendingFile[]) {
    setImages([...images, ...pages.map(fromPending)]);
  }

  function remove(key: string) {
    setImages(images.filter((f) => f.key !== key));
  }

  function move(index: number, delta: number) {
    const next = [...images];
    const [page] = next.splice(index, 1);
    next.splice(index + delta, 0, page);
    setImages(next);
  }

  // "+ Aggiungi pagina": scanner (or camera) or photos; the new pages go at the end
  async function addPages() {
    const choice = await chooseAction(addLabel, [canScan ? 'Scansiona' : 'Fotografa', 'Dalle foto']);
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
      Alert.alert('Scanner non disponibile', 'Togli le pagine con ✕ e aggiungine di nuove.');
    } else if (result !== 'cancelled') {
      setImages(pagesToFiles(result.pages).map(fromPending));
    }
  }

  async function changePdf() {
    const picked = await pickPdf().catch(showError);
    if (picked) onChange([...files.filter((f) => f.kind !== 'pdf'), fromPending(picked[0])]);
  }

  if (pdf) {
    return (
      <View style={styles.pdfRow}>
        <PageThumb file={pdf} label="PDF" />
        <SecondaryButton label="Sostituisci PDF" symbol="doc" onPress={changePdf} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {images.map((file, index) => (
            <PageThumb
              key={file.key}
              file={file}
              label={pageLabel(index, images.length, frontBack)}
              onRemove={() => remove(file.key)}
              onMoveLeft={index > 0 ? () => move(index, -1) : undefined}
              onMoveRight={index < images.length - 1 ? () => move(index, 1) : undefined}
            />
          ))}
        </ScrollView>
      )}

      <SecondaryButton label={`+ ${addLabel}`} onPress={addPages} />

      {images.length === 0 && <SecondaryButton label="Importa un PDF" symbol="doc" onPress={changePdf} />}

      {images.length > 0 && canScan && (
        <Pressable onPress={rescan} hitSlop={8} accessibilityRole="button" style={styles.rescan}>
          <Text style={styles.link}>Riscansiona tutto</Text>
        </Pressable>
      )}

      {/* Full-screen camera above the form, when there is no scanner */}
      <Modal visible={camera} animationType="slide" presentationStyle="fullScreen">
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

function showError(error: unknown): null {
  Alert.alert('Impossibile aprire il file', error instanceof Error ? error.message : String(error));
  return null;
}

type ThumbProps = {
  file: EditableFile;
  label: string | null; // null = a single page: no label
  onRemove?: () => void;
  onMoveLeft?: () => void; // undefined = first page
  onMoveRight?: () => void; // undefined = last page
};

// One page: thumbnail with ✕, its label, and ‹ › to move it (also for VoiceOver)
function PageThumb({ file, label, onRemove, onMoveLeft, onMoveRight }: ThumbProps) {
  const theme = useTheme();
  const name = label ?? 'Pagina';
  const canMove = Boolean(onMoveLeft || onMoveRight);

  return (
    <View style={styles.page}>
      <View>
        {file.kind === 'image' ? (
          <Image source={{ uri: file.uri }} style={[styles.thumb, { backgroundColor: theme.surface }]} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.pdfThumb, { backgroundColor: theme.surface }]}>
            <SymbolView name="doc.richtext" tintColor={BRAND_COLOR} size={32} />
          </View>
        )}
        {onRemove && (
          <Pressable
            onPress={onRemove}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Togli ${name}`}
            style={styles.remove}>
            <SymbolView name="xmark.circle.fill" tintColor="#FFFFFF" size={26} />
          </Pressable>
        )}
      </View>

      {(label || file.pending) && (
        <ThemedText type="smallBold" themeColor="textSecondary" numberOfLines={1}>
          {[label, file.pending && file.kind === 'image' ? 'nuova' : null].filter(Boolean).join(' · ')}
        </ThemedText>
      )}

      {canMove && (
        <View style={styles.arrows}>
          <Arrow symbol="chevron.left" label={`Sposta ${name} prima`} onPress={onMoveLeft} />
          <Arrow symbol="chevron.right" label={`Sposta ${name} dopo`} onPress={onMoveRight} />
        </View>
      )}
    </View>
  );
}

function Arrow({ symbol, label, onPress }: { symbol: 'chevron.left' | 'chevron.right'; label: string; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !onPress }}
      style={[styles.arrow, { backgroundColor: theme.backgroundSelected }, !onPress && styles.arrowDisabled]}>
      <SymbolView name={symbol} tintColor={theme.text} size={14} weight="semibold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  strip: {
    gap: 12,
  },
  pdfRow: {
    gap: 12,
    alignItems: 'flex-start',
  },
  page: {
    width: 120,
    alignItems: 'center',
    gap: 6,
  },
  thumb: {
    width: 120,
    height: 150, // portrait sheet
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  pdfThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  remove: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.45)', // the white ✕ is readable on any photo
  },
  arrows: {
    flexDirection: 'row',
    gap: 8,
  },
  arrow: {
    width: 44,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: {
    opacity: 0.35,
  },
  rescan: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  link: {
    color: BRAND_COLOR,
    fontSize: 15,
    fontFamily: FONTS.titleSemiBold,
  },
});
