import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LogoMark } from '@/components/logo-mark';
import { SUPPORT_EMAIL, writeToSupport } from '@/actions/contact';
import { Group, Row } from '@/components/grouped-list';
import { ThemedText } from '@/components/themed-text';
import { type Palette, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

// "Info e privacy" (from the Menu): app version and what happens to the user's documents
export default function AboutScreen() {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <LogoMark size={72} radius={16} />
          <ThemedText style={styles.name}>sottomano</ThemedText>{/* i18n-ignore: brand */}
          <ThemedText themeColor="textSecondary">{t('about.version', { version })}</ThemedText>
        </View>

        <Group
          title={t('about.privacy')}
          footer={t('about.privacyFooter')}>
          <Row label={t('about.onPhone')} symbol="lock.iphone" first />
          <Row label={t('about.offline')} symbol="wifi.slash" />
          <Row label={t('about.noTracking')} symbol="eye.slash" />
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
