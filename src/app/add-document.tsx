import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { pickPdf, pickPhotos } from '@/capture/pick-files';
import { SheetOption } from '@/components/sheet-option';
import { ThemedText } from '@/components/themed-text';
import { FONTS } from '@/constants/brand';
import { encodePendingFiles, type PendingFile } from '@/storage/pending-files';

// Bottom sheet "Aggiungi un documento", opened by the "+" tab.
// Every option ends on "Nuovo documento", with the captured files already attached.
export default function AddDocumentSheet() {
  // Runs a picker; if the user chose something, this sheet is replaced by the form.
  // replace (not push): after saving, the form closes and we are back on the tab, not on this sheet.
  async function attach(pick: () => Promise<PendingFile[] | null>) {
    try {
      const files = await pick();
      if (files) {
        router.replace({ pathname: '/new-document', params: { files: encodePendingFiles(files) } });
      }
    } catch (error) {
      Alert.alert('Impossibile aprire il file', String(error));
    }
  }

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Aggiungi un documento</ThemedText>
      <View style={styles.options}>
        <SheetOption symbol="camera" label="Fotografa" onPress={() => router.back()} />
        <SheetOption symbol="photo.on.rectangle" label="Scegli dalle foto" onPress={() => attach(pickPhotos)} />
        <SheetOption symbol="doc" label="Importa file" onPress={() => attach(pickPdf)} />
        <SheetOption
          symbol="square.and.pencil"
          label="Inserisci a mano"
          onPress={() => router.replace('/new-document')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 16,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: FONTS.titleBold,
  },
  options: {
    gap: 10,
  },
});
