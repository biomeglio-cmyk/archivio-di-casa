import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { DocumentForm } from '@/components/document-form';
import { FilesEditor, fromExisting, type EditableFile } from '@/components/files-editor';
import { getDocumentDetail, listDocumentFiles, saveDocumentEdits } from '@/db/documents';
import type { DocumentDetail, DocumentFile } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import type { PendingFile } from '@/storage/pending-files';

// Modal "Modifica documento": the same form as "Nuovo documento", already filled in
export default function EditDocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = Number(id);
  const { data: document } = useDbQuery((db) => getDocumentDetail(db, documentId), [documentId]);
  const { data: files } = useDbQuery((db) => listDocumentFiles(db, documentId), [documentId]);

  return (
    <>
      {/* The form reads its initial values once, so it is shown only after loading */}
      {document && files && <EditDocumentContent document={document} savedFiles={files} />}

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()}>Annulla</Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

function EditDocumentContent({ document, savedFiles }: { document: DocumentDetail; savedFiles: DocumentFile[] }) {
  const db = useSQLiteContext();
  const [files, setFiles] = useState<EditableFile[]>(() => savedFiles.map(fromExisting));

  return (
    <DocumentForm
      initial={document}
      files={<FilesEditor files={files} onChange={setFiles} />}
      onSubmit={async (input) => {
        // Compare with what is saved: files no longer in the list are removed, new ones are added
        const kept = new Set(files.flatMap((f) => (f.existing ? [f.existing.id] : [])));
        const removed = savedFiles.filter((f) => !kept.has(f.id));
        const added = files.flatMap((f): PendingFile[] => (f.pending ? [f.pending] : []));
        await saveDocumentEdits(db, document.id, input, removed, added);
        router.back();
      }}
    />
  );
}
