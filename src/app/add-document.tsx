import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { addByScan, addFromFiles, addFromPhotos } from '@/capture/add-actions';
import { startAddCard } from '@/capture/start-add-card';
import { SheetOption } from '@/components/sheet-option';
import { ThemedText } from '@/components/themed-text';
import { FONTS } from '@/constants/brand';

// Bottom sheet "Aggiungi un documento", opened by the "+" tab.
// Every option ends on "Nuovo documento", with the captured files already attached.
export default function AddDocumentSheet() {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Aggiungi un documento</ThemedText>
      <View style={styles.options}>
        <SheetOption symbol="doc.viewfinder" label="Scansiona" onPress={addByScan} />
        <SheetOption symbol="photo.on.rectangle" label="Scegli dalle foto" onPress={addFromPhotos} />
        <SheetOption symbol="doc" label="Importa file" onPress={addFromFiles} />
        <SheetOption symbol="creditcard" label="Aggiungi una carta" onPress={() => startAddCard('replace')} />
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
