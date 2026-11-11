import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';

import { CardForm } from '@/components/card-form';
import { DEFAULT_CARD_COLOR } from '@/constants/card-colors';
import { getCardsCategory } from '@/db/categories';
import { insertCard } from '@/db/documents';
import type { PendingFile } from '@/storage/pending-files';

// Modal "Nuova carta": the photos and the code come from the camera as route params
export default function NewCardScreen() {
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ front?: string; barcode?: string; code?: string; codeType?: string }>();

  return (
    <>
      <CardForm
        initial={{
          title: '',
          personId: null,
          barcodeValue: params.code || null,
          barcodeType: params.codeType || null,
          cardColor: DEFAULT_CARD_COLOR,
          coverMode: null,
          frontUri: params.front || null,
          barcodeUri: params.barcode || null,
        }}
        onSubmit={async (values) => {
          const category = await getCardsCategory(db);
          if (!category) throw new Error('La categoria "Tessere e card" non esiste più.');
          const files: PendingFile[] = [];
          if (values.frontUri) files.push({ uri: values.frontUri, kind: 'image', side: 'card_front' });
          if (values.barcodeUri) files.push({ uri: values.barcodeUri, kind: 'image', side: 'barcode' });
          await insertCard(db, { ...values, categoryId: category.id }, files);
          router.back();
        }}
      />

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()}>Annulla</Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}
