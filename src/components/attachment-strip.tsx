import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR } from '@/constants/brand';
import { useTheme } from '@/hooks/use-theme';
import type { PendingFile } from '@/storage/pending-files';

// "Fronte", "Retro" or "PDF" under each thumbnail
export function fileLabel(file: Pick<PendingFile, 'kind' | 'side'>): string {
  if (file.kind === 'pdf') return 'PDF';
  if (file.side === 'back') return 'Retro';
  return 'Fronte';
}

type Props = {
  files: PendingFile[];
};

// Thumbnails of the files attached to a document that is being created
export function AttachmentStrip({ files }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.strip}>
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
          <ThemedText type="smallBold" themeColor="textSecondary">
            {fileLabel(file)}
          </ThemedText>
        </View>
      ))}
    </View>
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
