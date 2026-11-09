import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { SheetOption } from '@/components/sheet-option';
import { ThemedText } from '@/components/themed-text';
import { FONTS } from '@/constants/brand';
import { getDocument } from '@/data/documents';

// Bottom sheet "Invia", opened from the document detail. Placeholder for now.
export default function SendDocumentSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const document = getDocument(id);

  return (
    <View style={styles.container}>
      <View>
        <ThemedText style={styles.title}>Invia documento</ThemedText>
        <ThemedText themeColor="textSecondary">{document?.title ?? 'Documento non trovato'}</ThemedText>
      </View>
      <ThemedText themeColor="textSecondary">
        Presto potrai inviare questo documento da qui.
      </ThemedText>
      <SheetOption symbol="xmark" label="Chiudi" onPress={() => router.back()} />
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
});
