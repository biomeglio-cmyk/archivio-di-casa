import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ScrollView, StyleSheet } from 'react-native';

import { Group, Row } from '@/components/grouped-list';
import { ThemedText } from '@/components/themed-text';
import { type Palette, Spacing } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

// "Termini d'uso" (Impostazioni › Informazioni, Sblocca). A placeholder: the real terms are
// written and published with the App Store version.
export default function TermsScreen() {
  const styles = useThemedStyles(makeStyles);
  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ThemedText themeColor="textSecondary" style={styles.intro}>
          I termini d’uso completi saranno pubblicati con la versione dell’App Store. In breve:
        </ThemedText>
        <Group>
          <Row label="Sottomano è gratis fino a 7 documenti e tessere" symbol="gift" first />
          <Row label="Lo sblocco è un acquisto unico, senza abbonamento" symbol="checkmark.seal" />
          <Row label="I tuoi documenti restano sul tuo telefono e sono tuoi" symbol="lock.iphone" />
          <Row label="Fai un backup per non perderli se cambi telefono" symbol="icloud.and.arrow.up" />
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
    gap: 16,
  },
  intro: {
    paddingHorizontal: 4,
  },
});
