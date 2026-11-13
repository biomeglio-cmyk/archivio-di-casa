import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LogoMark } from '@/components/logo-mark';
import { Group, Row } from '@/components/grouped-list';
import { ThemedText } from '@/components/themed-text';
import { type Palette, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { useThemedStyles } from '@/hooks/use-theme';

// "Info e privacy" (from the Menu): app version and what happens to the user's documents
export default function AboutScreen() {
  const styles = useThemedStyles(makeStyles);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <LogoMark size={72} radius={16} />
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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  content: {
    paddingVertical: 16,
    paddingHorizontal: Spacing.side,
    paddingBottom: 48,
    gap: 24,
  },
  brand: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
  name: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: FONTS.bold,
  },
});
