import { router, useLocalSearchParams } from 'expo-router';
import type { TFunction } from 'i18next';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { DocumentForm } from '@/components/document-form';
import { PasswordForm } from '@/components/password-form';
import { FilesEditor, filesToSave, fromPending, type EditableFile } from '@/components/files-editor';
import { ReadNotice } from '@/components/read-notice';
import { getCategory } from '@/db/categories';
import { insertDocument, setPinned } from '@/db/documents';
import { useDbQuery } from '@/hooks/use-db-query';
import { useI18n } from '@/i18n';
import { afterDocumentSaved } from '@/notifications/reminders';
import { savePassword } from '@/security/password-vault';
import { decodePendingFiles, type PendingFile } from '@/storage/pending-files';

// A PDF named "Polizza casa 2026.pdf" suggests the title "Polizza casa 2026"
function suggestTitle(files: PendingFile[]): string {
  const pdf = files.find((f) => f.kind === 'pdf' && f.name);
  return pdf?.name ? pdf.name.replace(/\.pdf$/i, '') : '';
}

// What the box under the pages says after a capture (Conferma design). Expo Go can't read the text
// of a photo, so only the name of an imported PDF is "read"; otherwise it asks to check the fields.
function readNotice(files: PendingFile[], t: TFunction): { title: string; text: string } | null {
  if (files.length === 0) return null;
  const suggested = suggestTitle(files);
  if (suggested) {
    return { title: t('newDocument.readTitle'), text: t('newDocument.readText', { name: suggested }) };
  }
  return { title: t('newDocument.checkTitle'), text: t('newDocument.checkText', { count: files.length }) };
}

// "Nuovo documento" (docs/design/Conferma.dc.html after a capture, Modifica.dc.html for the rest):
// the shared form, plus the pages captured before (if any), which can still be added, removed and
// reordered, and the "Letto dal documento" box
export default function NewDocumentScreen() {
  const { t } = useI18n();
  const db = useSQLiteContext();
  // Files arrive as a JSON route param from the "+" sheet or from the camera.
  // personId / categoryId preselect the person or the category ("Aggiungi documento" in their screens);
  // expiresAt ('YYYY-MM-DD', the "+" of Scadenze) opens it with the deadline on that day.
  const params = useLocalSearchParams<{ files?: string; personId?: string; categoryId?: string; expiresAt?: string }>();
  const [captured] = useState(() => decodePendingFiles(params.files));
  // The pages can still be added, removed and reordered before saving
  const [files, setFiles] = useState<EditableFile[]>(() => captured.map(fromPending));
  const notice = readNotice(captured, t);
  // "Nuovo…" in the Password folder: the Nuova password form (docs/design/NuovaPassword.dc.html)
  const categoryId = params.categoryId ? Number(params.categoryId) : null;
  const { data: category } = useDbQuery((d) => (categoryId ? getCategory(d, categoryId) : Promise.resolve(null)), [categoryId]);
  if (categoryId !== null && category === undefined) return null; // still reading the folder
  if (category?.isPassword) {
    return (
      <PasswordForm
        existing={null}
        categoryId={category.id}
        personId={params.personId ? Number(params.personId) : null}
      />
    );
  }

  return (
    <DocumentForm
      heading={t('newDocument.heading')}
      initial={{
        title: suggestTitle(captured),
        personId: params.personId ? Number(params.personId) : null,
        categoryId: params.categoryId ? Number(params.categoryId) : undefined,
        expiresAt: params.expiresAt && /^\d{4}-\d{2}-\d{2}$/.test(params.expiresAt) ? params.expiresAt : undefined,
      }}
      files={(category) => <FilesEditor files={files} category={category} onChange={setFiles} />}
      // A photo, or an imported PDF: its page 1 becomes the image, like a scan ("Foto" by default)
      hasPhoto={files.some((f) => f.kind === 'image' || f.kind === 'pdf')}
      notice={notice ? <ReadNotice title={notice.title} text={notice.text} /> : null}
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
  );
}
