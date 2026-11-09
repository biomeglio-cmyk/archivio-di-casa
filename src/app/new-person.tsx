import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { FormField, TextField } from '@/components/form-field';
import { GradientButton } from '@/components/gradient-button';
import { ThemedText } from '@/components/themed-text';
import { FONTS } from '@/constants/brand';
import { insertPerson } from '@/db/people';

// Bottom sheet "Nuova persona", opened by the + button of the Famiglia screen
export default function NewPersonSheet() {
  const db = useSQLiteContext();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      await insertPerson(db, name);
      // The Famiglia list updates by itself (useDbQuery listens to database changes)
      router.back();
    } catch (error) {
      setSaving(false);
      Alert.alert('Impossibile salvare', String(error));
    }
  }

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>Nuova persona</ThemedText>

      <FormField label="Nome">
        <TextField
          value={name}
          onChangeText={setName}
          placeholder="Es. Nonna"
          autoFocus
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
});
