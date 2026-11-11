import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { DocumentForm } from '@/components/document-form';
import { FilesEditor, filesToSave, fromExisting, type EditableFile } from '@/components/files-editor';
import { isPasswordCategory } from '@/db/categories';
import { getDocumentDetail, listDocumentFiles, saveDocumentEdits } from '@/db/documents';
import type { DocumentDetail, DocumentFile } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { afterDocumentSaved } from '@/notifications/reminders';
import { deletePassword, readPassword, savePassword } from '@/security/password-vault';

// Modal "Modifica documento": the same form as "Nuovo documento", already filled in
export default function EditDocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = Number(id);
  const { data: document } = useDbQuery((db) => getDocumentDetail(db, documentId), [documentId]);
  const { data: files } = useDbQuery((db) => listDocumentFiles(db, documentId), [documentId]);
  // Only whether a password exists (to show "••••" in the field): its value is never read here
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  useEffect(() => {
    readPassword(documentId).then(
      (value) => setHasPassword(value !== null),
      () => setHasPassword(false),
    );
  }, [documentId]);

  return (
    <>
      {/* The form reads its initial values once, so it is shown only after loading */}
      {document && files && hasPassword !== null && (
        <EditDocumentContent document={document} savedFiles={files} hasPassword={hasPassword} />
      )}

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()}>Annulla</Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

function EditDocumentContent({
  document,
  savedFiles,
  hasPassword,
}: {
  document: DocumentDetail;
  savedFiles: DocumentFile[];
  hasPassword: boolean;
}) {
  const db = useSQLiteContext();
  const [files, setFiles] = useState<EditableFile[]>(() => savedFiles.map(fromExisting));

  return (
    <DocumentForm
      initial={document}
      files={(category) => <FilesEditor files={files} category={category} onChange={setFiles} />}
      hasSavedPassword={hasPassword}
      onSubmit={async (input, password) => {
        // Compare with what is saved: files no longer in the list are removed, new ones are added
        const kept = new Set(files.flatMap((f) => (f.existing ? [f.existing.id] : [])));
        const removed = savedFiles.filter((f) => !kept.has(f.id));
        // New pages get their page number; saved pages that changed position are renumbered
        const { added, moved } = filesToSave(files);
        await saveDocumentEdits(db, document.id, input, removed, added, moved);
        // Password: a new one replaces the old; moved out of the "Password" category, it is deleted
        if (password !== null) await savePassword(document.id, password);
        else if (!(await isPasswordCategory(db, input.categoryId))) {
          await deletePassword(document.id);
        }
        await afterDocumentSaved(db, input.expiresAt);
        router.back();
      }}
    />
  );
}
