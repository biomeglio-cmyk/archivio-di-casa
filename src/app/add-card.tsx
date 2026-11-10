import { router, useLocalSearchParams } from 'expo-router';

import { CardCapture } from '@/components/card-capture';

// "Aggiungi carta": full-screen camera, then the "Nuova carta" form.
// With `front` (already scanned by startAddCard) only the barcode step is left.
export default function AddCardScreen() {
  const { front } = useLocalSearchParams<{ front?: string }>();

  return (
    <CardCapture
      steps={front ? ['barcode'] : ['front', 'barcode']}
      onCancel={() => router.back()}
      onDone={(result) =>
        // replace: after saving, the form closes straight back to the wallet
        router.replace({
          pathname: '/new-card',
          params: {
            front: front || result.frontUri || '',
            barcode: result.barcodeUri ?? '',
            code: result.code?.value ?? '',
            codeType: result.code?.type ?? '',
          },
        })
      }
    />
  );
}
