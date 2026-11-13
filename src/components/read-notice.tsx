import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { useIconRow } from '@/components/icon-row';
import { Text } from '@/components/text';
import { GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { type Palette } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

type Props = {
  title: string; // "Letto dal documento"
  text: string;
};

// The box under the pages of Nuovo documento after a capture (docs/design/Conferma.dc.html): a
// gradient square with sparkles, a 14/600 title and what was read, on pale lilac
export function ReadNotice({ title, text }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const iconRow = useIconRow(); // larger text: the sparkles above the texts
  return (
    // One element for VoiceOver: title and text; the sparkles are decoration
    <View style={[styles.box, iconRow.row]} accessible accessibilityLabel={`${title}, ${text}`}>
      <LinearGradient colors={theme.gradient} start={GRADIENT_START} end={GRADIENT_END} style={styles.icon}>
        <SymbolView name="sparkles" tintColor="#FFFFFF" size={17} />
      </LinearGradient>
      <View style={[styles.texts, iconRow.texts]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  box: {
    marginTop: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: c.paleLilac,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  text: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONTS.regular,
    color: c.textOnLilac,
  },
});
