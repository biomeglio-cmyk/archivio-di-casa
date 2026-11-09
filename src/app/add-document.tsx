import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { SheetOption } from '@/components/sheet-option';
import { ThemedText } from '@/components/themed-text';
import { FONTS } from '@/constants/brand';

// Bottom sheet "Aggiungi un documento", opened by the "+" tab.
// For now every option just closes the sheet: camera, photo library and file import come later.
export default function AddDocumentSheet() {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Aggiungi un documento</ThemedText>
      <View style={styles.options}>
        <SheetOption symbol="camera" label="Fotografa" onPress={() => router.back()} />
        <SheetOption symbol="photo.on.rectangle" label="Scegli dalle foto" onPress={() => router.back()} />
        <SheetOption symbol="doc" label="Importa file" onPress={() => router.back()} />
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
