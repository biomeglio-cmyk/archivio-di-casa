import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { pickPersonPhoto } from '@/capture/pick-files';
import { FormField, TextField } from '@/components/form-field';
import { GradientButton } from '@/components/gradient-button';
import { PersonAvatar } from '@/components/person-avatar';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR, FONTS } from '@/constants/brand';
import { getPerson, insertPerson, updatePerson } from '@/db/people';
import type { Person } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { deletePersonPhoto, storePersonPhoto } from '@/storage/person-photos';

// Bottom sheet for a person: "Nuova persona" (no id) or "Modifica persona" (?id=…)
export default function PersonFormSheet() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const personId = id ? Number(id) : null;
  const { data: person } = useDbQuery((db) => (personId ? getPerson(db, personId) : Promise.resolve(null)), [personId]);

  // Editing: wait for the saved values before showing the form (it reads its initial values once)
  if (personId !== null && !person) return null;

  return <PersonForm person={person ?? null} />;
}

// The photo in the form: unchanged, a new one just chosen, or removed
type PhotoChange = { kind: 'keep' } | { kind: 'new'; uri: string } | { kind: 'remove' };

function PersonForm({ person }: { person: Person | null }) {
  const db = useSQLiteContext();
  const [name, setName] = useState(person?.name ?? '');
  const [photo, setPhoto] = useState<PhotoChange>({ kind: 'keep' });
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && !saving;
  const hasPhoto = photo.kind === 'new' || (photo.kind === 'keep' && Boolean(person?.photoPath));

  async function changePhoto() {
    try {
      const result = await pickPersonPhoto(hasPhoto);
      if (result === 'remove') setPhoto({ kind: 'remove' });
      else if (result) setPhoto({ kind: 'new', uri: result });
    } catch (error) {
      Alert.alert('Impossibile usare la foto', String(error));
    }
  }

  async function save() {
    if (!canSave) return;
    setSaving(true);
    let storedPath: string | null = null;
    try {
      // New photo: square-resize and copy into people/ first; the database stores the relative path
      if (photo.kind === 'new') storedPath = await storePersonPhoto(photo.uri);
      const photoPath = photo.kind === 'new' ? storedPath : photo.kind === 'remove' ? null : (person?.photoPath ?? null);

      if (person) {
        await updatePerson(db, person.id, name, photoPath);
        // The old photo file goes only after the database points to the new state
        if (photo.kind !== 'keep' && person.photoPath) deletePersonPhoto(person.photoPath);
      } else {
        await insertPerson(db, name, photoPath);
      }
      router.back();
    } catch (error) {
      if (storedPath) deletePersonPhoto(storedPath);
      setSaving(false);
      Alert.alert('Impossibile salvare', String(error));
    }
  }

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>{person ? 'Modifica persona' : 'Nuova persona'}</ThemedText>

      {/* Avatar: tap to add, change or remove the photo */}
      <Pressable onPress={changePhoto} accessibilityRole="button" style={styles.avatar}>
        <PersonAvatar
          name={name}
          photoPath={photo.kind === 'keep' ? person?.photoPath : null}
          photoUri={photo.kind === 'new' ? photo.uri : null}
          size={96}
        />
        <Text style={styles.photoLink}>{hasPhoto ? 'Cambia foto' : 'Aggiungi foto'}</Text>
      </Pressable>

      <FormField label="Nome" required>
        <TextField
          value={name}
          onChangeText={setName}
          placeholder="Es. Nonna"
          autoFocus={!person}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={save}
        />
      </FormField>

      <GradientButton label="Salva" disabled={!canSave} onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 20,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: FONTS.titleBold,
  },
  avatar: {
    alignItems: 'center',
    gap: 8,
  },
  photoLink: {
    color: BRAND_COLOR,
    fontSize: 15,
    fontFamily: FONTS.titleSemiBold,
  },
});
