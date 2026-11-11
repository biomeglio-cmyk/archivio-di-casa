import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { GradientButton } from '@/components/gradient-button';
import { SecondaryButton } from '@/components/secondary-button';
import type { Category, DocumentFile } from '@/db/types';
import { previewDocumentFiles } from '@/storage/preview-files';

type Props = {
  documentId: number;
  title: string;
  category: Pick<Category, 'builtinKey'>;
  files: DocumentFile[]; // never empty: the detail shows these buttons only when there are files
};

// Buttons under the document files
export function DocumentActions({ documentId, title, category, files }: Props) {
  const pdf = files.find((f) => f.kind === 'pdf');
  const images = files.filter((f) => f.kind === 'image'); // already in page order

  // "Visualizza documento": PDF, or all the photos (front first, then the pages) full screen with zoom
  async function view() {
    const shown: DocumentFile[] = pdf ? [pdf] : images;
    try {
      await previewDocumentFiles(title, category, shown);
    } catch (error) {
      Alert.alert('Impossibile aprire il documento', error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <View style={styles.container}>
      <SecondaryButton label="Visualizza documento" symbol="eye" onPress={view} />
      {/* "Invia": format, size limit and preview in the send sheet, then share or save */}
      <GradientButton
        label="Invia"
        symbol="square.and.arrow.up"
        onPress={() => router.push({ pathname: '/send', params: { ids: String(documentId) } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
});
