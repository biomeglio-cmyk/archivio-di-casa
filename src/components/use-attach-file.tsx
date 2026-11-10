import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Modal } from 'react-native';

import { pickPdf, pickPhoto, pickPhotos } from '@/capture/pick-files';
import { CameraCapture } from '@/components/camera-capture';
import { replaceDocumentFiles } from '@/db/documents';
import type { Category, DocumentFile } from '@/db/types';
import type { PendingFile } from '@/storage/pending-files';
import { chooseAction } from '@/utils/action-sheet';
import { usesFrontBack } from '@/utils/page-labels';

type Side = 'front' | 'back';
type CameraMode = { only?: Side } | null; // {} = front then back, { only } = one face

// "Aggiungi documento" in the document detail: attaches a file to THIS document.
// No files yet → Fotografa / Scegli dalle foto / Importa PDF.
// Front already there → add the back, or replace a face. PDF → replace it.
// Returns the function to call and the full-screen camera to render in the screen.
export function useAttachFile(
  documentId: number,
  files: DocumentFile[],
  category: Pick<Category, 'isBuiltin' | 'symbol'> | undefined,
) {
  const db = useSQLiteContext();
  const [camera, setCamera] = useState<CameraMode>(null);

  const pdf = files.find((f) => f.kind === 'pdf');
  const front = files.find((f) => f.kind === 'image' && f.side !== 'back');
  const back = files.find((f) => f.kind === 'image' && f.side === 'back');
  // Names of the two photos: "fronte/retro" for IDs and cards, else "pagina 1/2"
  const cardLike = usesFrontBack(category, 2);
  const names = cardLike ? { front: 'il fronte', back: 'il retro' } : { front: 'la pagina 1', back: 'la pagina 2' };

  // New files replace the saved ones with the same role (same face, or the PDF)
  async function save(added: PendingFile[]) {
    const replaced = added.flatMap((file) => {
      if (file.kind === 'pdf') return pdf ? [pdf] : [];
      const old = file.side === 'back' ? back : front;
      return old ? [old] : [];
    });
    try {
      await replaceDocumentFiles(db, documentId, replaced, added);
    } catch (error) {
      Alert.alert('Impossibile salvare il file', error instanceof Error ? error.message : String(error));
    }
  }

  async function pickFace(side: Side) {
    const title = cardLike ? (side === 'front' ? 'Fronte' : 'Retro') : side === 'front' ? 'Pagina 1' : 'Pagina 2';
    const source = await chooseAction(title, ['Fotografa', 'Scegli dalle foto']);
    if (source === 0) setCamera({ only: side });
    if (source === 1) {
      const photo = await pickPhoto(side);
      if (photo) await save([photo]);
    }
  }

  async function attach() {
    try {
      if (pdf) {
        if ((await chooseAction('PDF', ['Sostituisci il PDF'])) === 0) {
          const picked = await pickPdf();
          if (picked) await save(picked);
        }
        return;
      }

      if (!front) {
        const choice = await chooseAction('Aggiungi documento', ['Fotografa', 'Scegli dalle foto', 'Importa PDF']);
        if (choice === 0) setCamera({}); // front, then back
        if (choice === 1) {
          const picked = await pickPhotos();
          if (picked) await save(picked);
        }
        if (choice === 2) {
          const picked = await pickPdf();
          if (picked) await save(picked);
        }
        return;
      }

      const options = back
        ? [`Sostituisci ${names.front}`, `Sostituisci ${names.back}`]
        : [cardLike ? 'Aggiungi il retro' : 'Aggiungi una pagina', `Sostituisci ${names.front}`];
      const choice = await chooseAction('Aggiungi documento', options);
      if (choice === null) return;
      const side: Side = back ? (choice === 0 ? 'front' : 'back') : choice === 0 ? 'back' : 'front';
      await pickFace(side);
    } catch (error) {
      Alert.alert('Impossibile aprire il file', error instanceof Error ? error.message : String(error));
    }
  }

  const cameraModal = (
    <Modal visible={camera !== null} animationType="slide" presentationStyle="fullScreen">
      {camera && (
        <CameraCapture
          only={camera.only}
          onDone={(captured) => {
            setCamera(null);
            save(captured);
          }}
          onCancel={() => setCamera(null)}
        />
      )}
    </Modal>
  );

  return { attach, cameraModal };
}
