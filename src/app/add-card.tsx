import { router } from 'expo-router';

import { CardCapture } from '@/components/card-capture';

// "Aggiungi carta": full-screen camera (front, then barcode), then the "Nuova carta" form
export default function AddCardScreen() {
  return (
    <CardCapture
      steps={['front', 'barcode']}
      onCancel={() => router.back()}
      onDone={(result) =>
        // replace: after saving, the form closes straight back to the wallet
        router.replace({
          pathname: '/new-card',
          params: {
            front: result.frontUri ?? '',
            barcode: result.barcodeUri ?? '',
            code: result.code?.value ?? '',
            codeType: result.code?.type ?? '',
          },
        })
      }
    />
  );
}
