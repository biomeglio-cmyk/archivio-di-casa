import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { CardForm } from '@/components/card-form';
import { DEFAULT_CARD_COLOR } from '@/constants/card-colors';
import { getCardsCategory } from '@/db/categories';
import { insertCard } from '@/db/documents';
import { useI18n } from '@/i18n';
import type { PendingFile } from '@/storage/pending-files';

// "Nuova tessera" (docs/design/NuovaTessera.dc.html): the photos and the code come from the camera
// as route params
export default function NewCardScreen() {
  const db = useSQLiteContext();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ front?: string; barcode?: string; code?: string; codeType?: string }>();

  return (
    <CardForm
      heading={t('newCard.title')}
      onCancel={() => router.back()}
      initial={{
        title: '',
        docType: null,
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
        if (!category) throw new Error(t('newCard.missingCategory'));
        const files: PendingFile[] = [];
        if (values.frontUri) files.push({ uri: values.frontUri, kind: 'image', side: 'card_front' });
        if (values.barcodeUri) files.push({ uri: values.barcodeUri, kind: 'image', side: 'barcode' });
        await insertCard(db, { ...values, categoryId: category.id }, files);
        router.back();
      }}
    />
  );
}
