import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Group, Row } from '@/components/grouped-list';
import { ThemedText } from '@/components/themed-text';
import { FONTS } from '@/constants/typography';

// "Info e privacy" (from the Menu): app version and what happens to the user's documents
export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <Image source={require('@/assets/images/logo-icon.png')} style={styles.logo} contentFit="cover" />
          <ThemedText style={styles.name}>sottomano</ThemedText>
          <ThemedText themeColor="textSecondary">Versione {version}</ThemedText>
        </View>

        <Group
          title="Privacy"
          footer="Se attivi il Calendario, le scadenze vengono scritte nel calendario dell'iPhone che scegli tu. Quando invii un documento, decidi tu con chi condividerlo.">
          <Row label="I tuoi documenti restano sul telefono" symbol="lock.iphone" first />
          <Row label="Nessun account e nessun server: funziona anche offline" symbol="wifi.slash" />
          <Row label="Nessun tracciamento e nessuna pubblicità" symbol="eye.slash" />
        </Group>
      </ScrollView>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" onPress={() => router.back()}>
          Fine
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 24,
  },
  brand: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  name: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: FONTS.bold,
  },
});
