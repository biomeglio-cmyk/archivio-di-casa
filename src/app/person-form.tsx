import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { confirmDeletePerson } from '@/actions/delete-actions';
import { DangerButton } from '@/components/danger-button';
import { FormField, TextField } from '@/components/form-field';
import { GradientButton } from '@/components/gradient-button';
import { ThemedText } from '@/components/themed-text';
import { FONTS } from '@/constants/brand';
import { getPerson, insertPerson, renamePerson } from '@/db/people';
import type { Person } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';

// Bottom sheet for a person: "Nuova persona" (no id) or "Modifica persona" (?id=…)
export default function PersonFormSheet() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const personId = id ? Number(id) : null;
  const { data: person } = useDbQuery((db) => (personId ? getPerson(db, personId) : Promise.resolve(null)), [personId]);

  // Editing: wait for the saved name before showing the form (it reads its initial value once)
  if (personId !== null && !person) return null;

  return <PersonForm person={person ?? null} />;
}

function PersonForm({ person }: { person: Person | null }) {
  const db = useSQLiteContext();
  const [name, setName] = useState(person?.name ?? '');
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      if (person) {
        await renamePerson(db, person.id, name);
      } else {
        await insertPerson(db, name);
      }
      // The lists update by themselves (useDbQuery listens to database changes)
      router.back();
    } catch (error) {
      setSaving(false);
      Alert.alert('Impossibile salvare', String(error));
    }
  }

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>{person ? 'Modifica persona' : 'Nuova persona'}</ThemedText>

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

      {person && (
        <DangerButton
          label="Elimina persona"
          onPress={() => confirmDeletePerson(db, person, () => router.back())}
        />
      )}
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
});
