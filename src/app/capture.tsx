import { router } from 'expo-router';

import { CameraCapture } from '@/components/camera-capture';
import { encodePendingFiles, pagesToFiles } from '@/storage/pending-files';

// Camera when the scanner isn't available: N pages, then "Nuovo documento" with the photos attached
export default function CaptureScreen() {
  return (
    <CameraCapture
      onDone={(uris) => router.replace({ pathname: '/new-document', params: { files: encodePendingFiles(pagesToFiles(uris)) } })}
      onCancel={() => router.back()}
    />
  );
}
