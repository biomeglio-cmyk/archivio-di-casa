import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActionSheetIOS, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { pickPdf, pickPhoto } from '@/capture/pick-files';
import { CameraCapture } from '@/components/camera-capture';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR, FONTS } from '@/constants/brand';
import type { DocumentFile } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { resolveDocumentFile } from '@/storage/document-files';
import type { PendingFile } from '@/storage/pending-files';

type Side = 'front' | 'back';

// A file in the edit form: either already saved (existing) or just captured (pending)
export type EditableFile = {
  key: string;
  kind: DocumentFile['kind'];
  side: DocumentFile['side'];
  uri: string;
  name?: string;
  existing?: DocumentFile;
  pending?: PendingFile;
};

export function fromExisting(file: DocumentFile): EditableFile {
  return {
    key: `saved-${file.id}`,
    kind: file.kind,
    side: file.side,
    uri: resolveDocumentFile(file.path).uri,
    existing: file,
  };
}

function fromPending(file: PendingFile): EditableFile {
  return { key: `new-${file.uri}`, kind: file.kind, side: file.side, uri: file.uri, name: file.name, pending: file };
}

// Native iOS action sheet: take a photo or choose one
function askPhotoSource(title: string): Promise<'camera' | 'library' | null> {
  return new Promise((resolve) => {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options: ['Fotografa', 'Scegli dalle foto', 'Annulla'], cancelButtonIndex: 2 },
      (index) => resolve(index === 0 ? 'camera' : index === 1 ? 'library' : null),
    );
  });
}

type Props = {
  files: EditableFile[];
  onChange: (files: EditableFile[]) => void;
};

// Files section of "Modifica documento": replace or retake the front, add or remove the back,
// replace the PDF, or attach files to a document that has none.
export function FilesEditor({ files, onChange }: Props) {
  const [cameraSide, setCameraSide] = useState<Side | null>(null);

  const pdf = files.find((f) => f.kind === 'pdf');
  const front = files.find((f) => f.kind === 'image' && f.side !== 'back');
  const back = files.find((f) => f.kind === 'image' && f.side === 'back');

  // Puts a new photo on a face, replacing whatever was there
  function setFace(file: PendingFile) {
    onChange([...files.filter((f) => !(f.kind === 'image' && (f.side ?? 'front') === file.side)), fromPending(file)]);
  }

  async function changeFace(side: Side) {
    const source = await askPhotoSource(side === 'front' ? 'Fronte' : 'Retro');
    if (source === 'camera') {
      setCameraSide(side);
    } else if (source === 'library') {
      const photo = await pickPhoto(side).catch(showError);
      if (photo) setFace(photo);
    }
  }

  async function changePdf() {
    const picked = await pickPdf().catch(showError);
    if (picked) onChange([...files.filter((f) => f.kind !== 'pdf'), fromPending(picked[0])]);
  }

  function removeBack() {
    onChange(files.filter((f) => f !== back));
  }

  return (
    <View style={styles.container}>
      {pdf && (
        <View style={styles.slots}>
          <Slot label="PDF" file={pdf} actions={[{ label: 'Sostituisci PDF', onPress: changePdf }]} />
        </View>
      )}

      {!pdf && front && (
        <View style={styles.slots}>
          <Slot label="Fronte" file={front} actions={[{ label: 'Sostituisci', onPress: () => changeFace('front') }]} />
          {back ? (
            <Slot
              label="Retro"
              file={back}
              actions={[
                { label: 'Sostituisci', onPress: () => changeFace('back') },
                { label: 'Rimuovi', onPress: removeBack, destructive: true },
              ]}
            />
          ) : (
            <AddSlot label="Aggiungi retro" onPress={() => changeFace('back')} />
          )}
        </View>
      )}

      {!pdf && !front && (
        <View style={styles.addButtons}>
          <SecondaryButton label="Aggiungi foto" symbol="camera" onPress={() => changeFace('front')} />
          <SecondaryButton label="Aggiungi PDF" symbol="doc" onPress={changePdf} />
        </View>
      )}

      {/* Full-screen camera for a single face, above the edit form */}
      <Modal visible={cameraSide !== null} animationType="slide" presentationStyle="fullScreen">
        {cameraSide && (
          <CameraCapture
            only={cameraSide}
            onDone={(captured) => {
              setFace(captured[0]);
              setCameraSide(null);
            }}
            onCancel={() => setCameraSide(null)}
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

type SlotAction = { label: string; onPress: () => void; destructive?: boolean };

function Slot({ label, file, actions }: { label: string; file: EditableFile; actions: SlotAction[] }) {
  const theme = useTheme();
  return (
    <View style={styles.slot}>
      {file.kind === 'image' ? (
        <Image source={{ uri: file.uri }} style={[styles.thumb, { backgroundColor: theme.backgroundElement }]} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.pdf, { backgroundColor: theme.backgroundElement }]}>
          <SymbolView name="doc.richtext" tintColor={BRAND_COLOR} size={32} />
        </View>
      )}
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
        {file.pending ? ' · nuovo' : ''}
      </ThemedText>
      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable key={action.label} onPress={action.onPress} hitSlop={8}>
            <Text style={[styles.action, action.destructive && styles.destructive]}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function AddSlot({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.slot}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={[styles.thumb, styles.addThumb, { borderColor: theme.textSecondary }]}>
        <SymbolView name="plus" tintColor={theme.textSecondary} size={24} />
      </Pressable>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  slots: {
    flexDirection: 'row',
    gap: 12,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  thumb: {
    width: '100%',
    aspectRatio: 1.45,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  pdf: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addThumb: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
  action: {
    color: BRAND_COLOR,
    fontSize: 15,
    fontFamily: FONTS.titleSemiBold,
  },
  destructive: {
    color: '#E5383B',
  },
  addButtons: {
    gap: 10,
  },
});
