import { Stack } from 'expo-router/stack';

// Stack of the "Scadenze" tab: list → document
export default function DeadlinesLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitleEnabled: true }}>
      <Stack.Screen name="index" options={{ title: 'Scadenze' }} />
    </Stack>
  );
}
