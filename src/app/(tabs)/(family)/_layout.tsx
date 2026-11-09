import { Stack } from 'expo-router/stack';

// Stack of the "Famiglia" tab: people → person → document
export default function FamilyLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitleEnabled: true }}>
      <Stack.Screen name="family" options={{ title: 'Famiglia' }} />
      <Stack.Screen name="person/[id]" />
      <Stack.Screen name="document/[id]" options={{ headerLargeTitleEnabled: false }} />
    </Stack>
  );
}
