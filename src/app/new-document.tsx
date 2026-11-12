import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { DocumentForm } from '@/components/document-form';
import { FilesEditor, filesToSave, fromPending, type EditableFile } from '@/components/files-editor';
import { insertDocument, setPinned } from '@/db/documents';
import { afterDocumentSaved } from '@/notifications/reminders';
import { savePassword } from '@/security/password-vault';
import { decodePendingFiles, type PendingFile } from '@/storage/pending-files';

// A PDF named "Polizza casa 2026.pdf" suggests the title "Polizza casa 2026"
function suggestTitle(files: PendingFile[]): string {
  const pdf = files.find((f) => f.kind === 'pdf' && f.name);
  return pdf?.name ? pdf.name.replace(/\.pdf$/i, '') : '';
}

// Modal "Nuovo documento": the shared form, plus the pages captured before (if any), which can
// still be added, removed and reordered
export default function NewDocumentScreen() {
  const db = useSQLiteContext();
  // Files arrive as a JSON route param from the "+" sheet or from the camera.
  // personId / categoryId preselect the person or the category ("Aggiungi documento" in their screens).
  const params = useLocalSearchParams<{ files?: string; personId?: string; categoryId?: string }>();
  const [captured] = useState(() => decodePendingFiles(params.files));
  // The pages can still be added, removed and reordered before saving
  const [files, setFiles] = useState<EditableFile[]>(() => captured.map(fromPending));

  return (
    <>
      <DocumentForm
        heading="Nuovo documento"
        initial={{
          title: suggestTitle(captured),
          personId: params.personId ? Number(params.personId) : null,
          categoryId: params.categoryId ? Number(params.categoryId) : undefined,
        }}
        files={(category) => <FilesEditor files={files} category={category} onChange={setFiles} />}
        hasPhoto={files.some((f) => f.kind === 'image')}
        autoFocusTitle={captured.length === 0}
        onSubmit={async (input, password, { pinned }) => {
          const id = await insertDocument(db, input, filesToSave(files).added);
          if (pinned) await setPinned(db, id, true);
          // "Password" category: the password goes only to the iOS Keychain
          if (password !== null) await savePassword(id, password);
          await afterDocumentSaved(db, input.expiresAt);
          // Scadenze, Home and Famiglia update by themselves (useDbQuery listens to changes)
          router.back();
        }}
      />

    </>
  );
}
