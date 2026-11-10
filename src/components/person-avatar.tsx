import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { BRAND_COLOR, FONTS } from '@/constants/brand';
import { personPhotoUri } from '@/storage/person-photos';

type Props = {
  name: string;
  photoPath?: string | null; // saved photo (relative path)
  photoUri?: string | null; // photo just chosen in the form, not saved yet (wins over photoPath)
  size: number;
};

// Round avatar: the person's photo, or their initial on a soft brand-colored circle
export function PersonAvatar({ name, photoPath, photoUri, size }: Props) {
  const circle = { width: size, height: size, borderRadius: size / 2 };
  const uri = photoUri ?? (photoPath ? personPhotoUri(photoPath) : null);

  if (uri) {
    return <Image source={{ uri }} style={[styles.photo, circle]} contentFit="cover" transition={120} />;
  }

  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={[styles.placeholder, circle]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    backgroundColor: `${BRAND_COLOR}1F`,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BRAND_COLOR}1F`, // brand color at ~12%
  },
  initial: {
    color: BRAND_COLOR,
    fontFamily: FONTS.titleSemiBold,
  },
});
