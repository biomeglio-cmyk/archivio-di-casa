import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { AttachmentStrip } from '@/components/attachment-strip';
import { DocumentForm } from '@/components/document-form';
import { insertDocument } from '@/db/documents';
import { afterDocumentSaved } from '@/notifications/reminders';
import { decodePendingFiles, type PendingFile } from '@/storage/pending-files';

// A PDF named "Polizza casa 2026.pdf" suggests the title "Polizza casa 2026"
function suggestTitle(files: PendingFile[]): string {
  const pdf = files.find((f) => f.kind === 'pdf' && f.name);
  return pdf?.name ? pdf.name.replace(/\.pdf$/i, '') : '';
}

// Modal "Nuovo documento": the shared form, plus the files captured before (if any)
export default function NewDocumentScreen() {
  const db = useSQLiteContext();
  // Files arrive as a JSON route param from the "+" sheet or from the camera.
  // personId / categoryId preselect the person or the category ("Aggiungi documento" in their screens).
  const params = useLocalSearchParams<{ files?: string; personId?: string; categoryId?: string }>();
  const [files] = useState(() => decodePendingFiles(params.files));

  return (
    <>
      <DocumentForm
        initial={{
          title: suggestTitle(files),
          personId: params.personId ? Number(params.personId) : null,
          categoryId: params.categoryId ? Number(params.categoryId) : undefined,
        }}
        files={files.length > 0 ? (category) => <AttachmentStrip files={files} category={category} /> : undefined}
        autoFocusTitle={files.length === 0}
        onSubmit={async (input) => {
          await insertDocument(db, input, files);
          await afterDocumentSaved(db, input.expiresAt);
          // Scadenze, Archivio and Famiglia update by themselves (useDbQuery listens to changes)
          router.back();
        }}
      />

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()}>Annulla</Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}
