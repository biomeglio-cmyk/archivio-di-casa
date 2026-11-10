import { router } from 'expo-router';

import { CameraCapture } from '@/components/camera-capture';
import { encodePendingFiles } from '@/storage/pending-files';

// "+" → "Fotografa": front, then back; then "Nuovo documento" with the photos attached
export default function CaptureScreen() {
  return (
    <CameraCapture
      onDone={(files) => router.replace({ pathname: '/new-document', params: { files: encodePendingFiles(files) } })}
      onCancel={() => router.back()}
    />
  );
}
