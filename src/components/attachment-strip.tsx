import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR } from '@/constants/brand';
import { useTheme } from '@/hooks/use-theme';
import type { Category } from '@/db/types';
import type { PendingFile } from '@/storage/pending-files';
import { pageLabel, usesFrontBack } from '@/utils/page-labels';


type Props = {
  files: PendingFile[];
  category: Pick<Category, 'isBuiltin' | 'symbol'> | undefined; // decides "Fronte/Retro" or "Pagina N"
};

// Thumbnails of the files attached to a document that is being created (all scanned pages, in order)
export function AttachmentStrip({ files, category }: Props) {
  const theme = useTheme();
  const images = files.filter((f) => f.kind === 'image');
  const frontBack = usesFrontBack(category, images.length);
  const labelOf = (file: PendingFile) =>
    file.kind === 'pdf' ? 'PDF' : pageLabel(images.indexOf(file), images.length, frontBack);

  return (
    // Scrolls sideways when a scan has many pages
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {files.map((file) => (
        <View key={file.uri} style={styles.item}>
          {file.kind === 'image' ? (
            <Image source={{ uri: file.uri }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, styles.pdf, { backgroundColor: theme.surface }]}>
              <SymbolView name="doc.richtext" tintColor={BRAND_COLOR} size={32} />
              {file.name && (
                <ThemedText type="small" numberOfLines={2} style={styles.pdfName}>
                  {file.name}
                </ThemedText>
              )}
            </View>
          )}
          {labelOf(file) && (
            <ThemedText type="smallBold" themeColor="textSecondary">
              {labelOf(file)}
            </ThemedText>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    gap: 12,
  },
  item: {
    alignItems: 'center',
    gap: 6,
  },
  thumb: {
    width: 140,
    height: 96,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  pdf: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 8,
  },
  pdfName: {
    textAlign: 'center',
  },
});
