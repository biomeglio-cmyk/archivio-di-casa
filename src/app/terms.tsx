import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ScrollView, StyleSheet } from 'react-native';

import { SUPPORT_EMAIL, writeToSupport } from '@/actions/contact';
import { Group, Row } from '@/components/grouped-list';
import { ThemedText } from '@/components/themed-text';
import { type Palette, Spacing } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { FREE_LIMIT } from '@/settings/free-limit';

// "Termini d'uso" (Impostazioni › Informazioni, Sblocca). A placeholder: the real terms are
// written and published with the App Store version.
export default function TermsScreen() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ThemedText themeColor="textSecondary" style={styles.intro}>
          {t('terms.intro')}
        </ThemedText>
        <Group>
          <Row label={t('terms.free', { count: FREE_LIMIT })} symbol="gift" first />
          <Row label={t('terms.oneTime')} symbol="checkmark.seal" />
          <Row label={t('terms.yours')} symbol="lock.iphone" />
          <Row label={t('terms.backup')} symbol="icloud.and.arrow.up" />
        </Group>

        <Group title={t('contact.title')}>
          <Row label={t('contact.writeUs')} value={SUPPORT_EMAIL} symbol="envelope" onPress={() => void writeToSupport()} first />
        </Group>
      </ScrollView>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" onPress={() => router.back()}>
          {t('common.done')}
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
