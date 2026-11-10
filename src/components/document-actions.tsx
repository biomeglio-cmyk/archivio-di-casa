import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';

import { FrontBackComposer, type FrontBackComposerHandle } from '@/components/front-back-composer';
import { GradientButton } from '@/components/gradient-button';
import { SecondaryButton } from '@/components/secondary-button';
import type { DocumentFile } from '@/db/types';
import { resolveDocumentFile } from '@/storage/document-files';
import { previewDocumentFiles } from '@/storage/preview-files';
import { askShareFormat } from '@/sharing/share-format';
import { namedCopy } from '@/storage/share-copies';

type Props = {
  title: string;
  files: DocumentFile[]; // never empty: the detail shows these buttons only when there are files
};

// Buttons under the document files
export function DocumentActions({ title, files }: Props) {
  const composerRef = useRef<FrontBackComposerHandle>(null);
  const [sending, setSending] = useState(false);

  const pdf = files.find((f) => f.kind === 'pdf');
  const front = files.find((f) => f.kind === 'image' && f.side !== 'back');
  const back = files.find((f) => f.kind === 'image' && f.side === 'back');

  // "Visualizza documento": PDF, or the photos (front first) full screen with zoom
  async function view() {
    const shown = pdf ? [pdf] : [front, back].filter((f): f is DocumentFile => f !== undefined);
    try {
      await previewDocumentFiles(title, shown);
    } catch (error) {
      Alert.alert('Impossibile aprire il documento', error instanceof Error ? error.message : String(error));
    }
  }

  // "Invia": opens the iOS share sheet (WhatsApp, Mail, Messaggi, AirDrop, Salva su File…)
  async function send() {
    // Front and back: ask first (native action sheet), before showing "Preparazione…"
    const format = !pdf && front && back ? await askShareFormat() : null;
    if (!pdf && front && back && format === null) return; // cancelled

    setSending(true);
    try {
      if (pdf) {
        const copy = await namedCopy(resolveDocumentFile(pdf.path), title);
        await Sharing.shareAsync(copy.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title });
      } else if (front && back && format === 'separate') {
        // The share sheet in Expo Go takes one file: we open it twice, front then back.
        // React Native's Share tells us if the first one was dismissed, so we can stop there.
        const frontCopy = await namedCopy(resolveDocumentFile(front.path), `${title} - Fronte`);
        const first = await Share.share({ url: frontCopy.uri, title: `${title} - Fronte` });
        if (first.action !== Share.dismissedAction) {
          const backCopy = await namedCopy(resolveDocumentFile(back.path), `${title} - Retro`);
          await Share.share({ url: backCopy.uri, title: `${title} - Retro` });
        }
      } else if (front && back && composerRef.current) {
        const composed = await composerRef.current.compose();
        const copy = await namedCopy(new File(composed.uri), `${title} - fronte e retro`);
        await Sharing.shareAsync(copy.uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg', dialogTitle: title });
      } else if (front) {
        const copy = await namedCopy(resolveDocumentFile(front.path), title);
        await Sharing.shareAsync(copy.uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg', dialogTitle: title });
      }
    } catch (error) {
      Alert.alert('Impossibile inviare il documento', error instanceof Error ? error.message : String(error));
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.container}>
      <SecondaryButton label="Visualizza documento" symbol="eye" onPress={view} />
      <GradientButton
        label={sending ? 'Preparazione…' : 'Invia'}
        symbol="square.and.arrow.up"
        disabled={sending}
        onPress={send}
      />

      {/* Only needed to merge two faces into one image for sharing */}
      {!pdf && front && back && (
        <FrontBackComposer
          ref={composerRef}
          frontUri={resolveDocumentFile(front.path).uri}
          backUri={resolveDocumentFile(back.path).uri}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
});
