import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';

import { CardForm } from '@/components/card-form';
import { DEFAULT_CARD_COLOR } from '@/constants/card-colors';
import { getDocumentDetail, listDocumentFiles, saveCardEdits } from '@/db/documents';
import type { DocumentDetail, DocumentFile, FileSide } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { applyCardFrontChoice, usesOriginalFront } from '@/storage/card-fronts';
import { resolveDocumentFile } from '@/storage/document-files';
import type { PendingFile } from '@/storage/pending-files';

// Modal "Modifica carta": the card form, already filled in
export default function EditCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cardId = Number(id);
  const { data: card } = useDbQuery((db) => getDocumentDetail(db, cardId), [cardId]);
  const { data: files } = useDbQuery((db) => listDocumentFiles(db, cardId), [cardId]);

  return (
    <>
      {/* The form reads its initial values once, so it is shown only after loading */}
      {card && files && <EditCardContent card={card} savedFiles={files} />}

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()}>Annulla</Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

// The saved photo with this role; a card added with the normal form may only have a 'front'
function photoOf(files: DocumentFile[], sides: FileSide[]): DocumentFile | undefined {
  return files.find((f) => f.kind === 'image' && f.side !== null && sides.includes(f.side));
}

function EditCardContent({ card, savedFiles }: { card: DocumentDetail; savedFiles: DocumentFile[] }) {
  const db = useSQLiteContext();
  const front = photoOf(savedFiles, ['card_front', 'front']);
  const barcode = photoOf(savedFiles, ['barcode']);

  return (
    <CardForm
      initial={{
        title: card.title,
        personId: card.personId,
        barcodeValue: card.barcodeValue,
        barcodeType: card.barcodeType,
        cardColor: card.cardColor ?? DEFAULT_CARD_COLOR,
        coverMode: card.coverMode,
        frontUri: front ? resolveDocumentFile(front.path).uri : null,
        barcodeUri: barcode ? resolveDocumentFile(barcode.path).uri : null,
        useOriginalFront: front ? usesOriginalFront(front.path) : false,
      }}
      onSubmit={async (values, changed) => {
        // A retaken photo replaces the saved one with the same role
        const removed: DocumentFile[] = [];
        const added: PendingFile[] = [];
        if (changed.front && values.frontUri) {
          if (front) removed.push(front);
          added.push({ uri: values.frontUri, kind: 'image', side: 'card_front' });
        }
        if (changed.barcode && values.barcodeUri) {
          if (barcode) removed.push(barcode);
          added.push({ uri: values.barcodeUri, kind: 'image', side: 'barcode' });
        }
        await saveCardEdits(db, card.id, { ...values, categoryId: card.categoryId }, removed, added);
        void applyCardFrontChoice(db, card.id, values.useOriginalFront); // clean copy in the background
        router.back();
      }}
    />
  );
}
