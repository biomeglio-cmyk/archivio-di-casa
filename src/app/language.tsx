import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { SymbolView } from 'expo-symbols';
import { Fragment, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { WhiteCard } from '@/components/white-card';
import { BRAND_COLOR } from '@/constants/brand';
import { type Palette, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useLanguageSetting } from '@/i18n/use-language';
import { LANGUAGE_INFO, languageInfo, resolveLanguage, type LanguageSetting } from '@/settings/language';

type Option = { setting: LanguageSetting; name: string; detail: string | null; search: string };

// Lowercase without accents: "Français" is found with "francais", "Čeština" with "cestina"
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

// "Lingua" (Impostazioni › Aspetto): a searchable list. "Automatica" first (the iPhone language
// when the app has it, otherwise English), then every language in its own name. A tap applies
// it at once, in place, like the theme.
export default function LanguageScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const { setting, setSetting } = useLanguageSetting();
  const [query, setQuery] = useState('');

  const automatic = languageInfo(resolveLanguage('auto'));
  const languages = [...LANGUAGE_INFO].sort((a, b) => a.name.localeCompare(b.name));
  const options: Option[] = [
    {
      setting: 'auto',
      name: t('language.auto'),
      detail: t('language.autoDetail', { language: automatic.name }),
      search: `${t('language.auto')} auto automatic`,
    },
    ...languages.map((l) => ({
      setting: l.code,
      name: l.name,
      // The English name under the native one, so everybody recognizes it ("Magyar · Hungarian")
      detail: l.code === 'en' ? null : l.english,
      search: `${l.name} ${l.english} ${l.code}`,
    })),
  ];
  const needle = fold(query.trim());
  const shown = needle ? options.filter((o) => fold(o.search).includes(needle)) : options;

  return (
    <>
      <Stack.SearchBar
        placeholder={t('language.search')}
        onChangeText={(event) => setQuery(event.nativeEvent.text)}
        onCancelButtonPress={() => setQuery('')}
        hideWhenScrolling={false}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>
        {shown.length === 0 ? (
          <Text style={styles.empty}>{t('language.noResults', { query: query.trim() })}</Text>
        ) : (
          <WhiteCard style={styles.card}>
            {shown.map((option, index) => {
              const selected = option.setting === setting;
              return (
                <Fragment key={option.setting}>
                  {index > 0 && <View style={styles.separator} />}
                  <Pressable
                    onPress={() => void setSetting(option.setting)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={option.detail ? `${option.name}, ${option.detail}` : option.name}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                    <View style={styles.texts}>
                      <Text style={styles.name}>{option.name}</Text>
                      {option.detail && <Text style={styles.detail}>{option.detail}</Text>}
                    </View>
                    {selected && <SymbolView name="checkmark" tintColor={BRAND_COLOR(theme)} size={18} weight="semibold" />}
                  </Pressable>
                </Fragment>
              );
            })}
          </WhiteCard>
        )}
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
    },
    card: {
      paddingVertical: 4,
    },
    row: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    pressed: {
      opacity: 0.6,
    },
    texts: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontSize: 16,
      fontFamily: FONTS.medium,
      color: c.text,
    },
    detail: {
      fontSize: 13,
      fontFamily: FONTS.regular,
      color: c.textSecondary,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.separator,
      marginLeft: 16,
    },
    empty: {
      marginTop: 24,
      textAlign: 'center',
      fontSize: 15,
      fontFamily: FONTS.regular,
      color: c.textSecondary,
    },
  });
