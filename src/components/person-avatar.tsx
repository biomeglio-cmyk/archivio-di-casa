import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { Text } from '@/components/text';
import { GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { avatarGradient } from '@/constants/person-roles';
import { type Palette } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { personPhotoUri } from '@/storage/person-photos';
import { useThemedStyles } from '@/hooks/use-theme';

type Props = {
  name: string;
  photoPath?: string | null; // saved photo (relative path)
  photoUri?: string | null; // photo just chosen in the form, not saved yet (wins over photoPath)
  size: number;
  shadow?: boolean; // the soft colored shadow of the design (Famiglia, Persona)
};

// Round avatar: the person's photo, or their initial in white on a gradient (always the same one
// for the same name), as in docs/design/Utenti.dc.html. Decorative: the name is always next to it,
// so VoiceOver skips it
export function PersonAvatar({ name, photoPath, photoUri, size, shadow = false }: Props) {
  const styles = useThemedStyles(makeStyles);
  const circle = { width: size, height: size, borderRadius: size / 2 };
  const uri = photoUri ?? (photoPath ? personPhotoUri(photoPath) : null);
  const gradient = avatarGradient(name);
  const glow = shadow ? { boxShadow: `0 6px 12px rgba(${gradient.shadow}, 0.22)` } : null;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.photo, circle, glow]}
        contentFit="cover"
        transition={120}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <LinearGradient
      colors={gradient.colors}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={[styles.placeholder, circle, glow]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {/* Sized with the circle, which doesn't grow with the text */}
      <Text style={[styles.initial, { fontSize: Math.round(size * 0.38) }]} allowFontScaling={false}>
        {initial}
      </Text>
    </LinearGradient>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  photo: {
    backgroundColor: c.lilac,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#FFFFFF',
    fontFamily: FONTS.semiBold,
  },
});
