import { Stack } from 'expo-router/stack';

// Stack of the "Archivio" tab: categories grid → category → document
export default function ArchiveLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitleEnabled: true }}>
      <Stack.Screen name="archive" options={{ title: 'Archivio' }} />
    </Stack>
  );
}
