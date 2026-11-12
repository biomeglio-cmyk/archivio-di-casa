import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { SecondaryButton } from '@/components/secondary-button';
import type { Category, DocumentFile } from '@/db/types';

type Props = {
  documentId: number;
  title: string;
  category: Pick<Category, 'builtinKey'>;
  files: DocumentFile[]; // never empty: the detail shows these buttons only when there are files
};

// Buttons under the document files
export function DocumentActions({ documentId }: Props) {
  // "Visualizza documento": the Visualizza screen (pages on a dark background, zoom, Invia)
  function view() {
    router.push({ pathname: '/view/[id]', params: { id: String(documentId) } });
  }

  return (
    <View style={styles.container}>
      <SecondaryButton label="Visualizza documento" symbol="eye" onPress={view} />
      {/* "Invia": format, size limit and preview in the send sheet, then share or save */}
      <PrimaryButton
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
