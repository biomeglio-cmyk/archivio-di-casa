import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pickPersonPhoto } from '@/capture/pick-files';
import { ActionSheet } from '@/components/action-sheet';
import { PersonAvatar } from '@/components/person-avatar';
import { PrimaryButton } from '@/components/primary-button';
import { RoundIconButton } from '@/components/round-icon-button';
import { Text, TextInput } from '@/components/text';
import { PERSON_ROLES } from '@/constants/person-roles';
import { CardSurface, Colors, Spacing, themedStyles } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { getPerson, insertPerson, updatePerson } from '@/db/people';
import type { Person, PersonRole } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { deletePersonPhoto, storePersonPhoto } from '@/storage/person-photos';

// "Nuova persona" (no id) or "Modifica persona" (?id=…)
export default function PersonFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const personId = id ? Number(id) : null;
  const { data: person } = useDbQuery((db) => (personId ? getPerson(db, personId) : Promise.resolve(null)), [personId]);

  // Editing: wait for the saved values before showing the form (it reads its initial values once)
  if (personId !== null && !person) return null;

  return <PersonForm person={person ?? null} />;
}

// The photo in the form: unchanged, a new one just chosen, or removed
type PhotoChange = { kind: 'keep' } | { kind: 'new'; uri: string } | { kind: 'remove' };

// docs/design/NuovoUtente.dc.html: back and the title, the round "Aggiungi foto" (dashed), "NOME",
// "CHI È" (Partner, Figlio o figlia…; our extra "Sono io" gives the "Tu" badge), the note and
// "Aggiungi alla famiglia"
function PersonForm({ person }: { person: Person | null }) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(person?.name ?? '');
  const [role, setRole] = useState<PersonRole>(person?.role ?? 'partner');
  const [photo, setPhoto] = useState<PhotoChange>({ kind: 'keep' });
  const [rolesOpen, setRolesOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && !saving;
  const hasPhoto = photo.kind === 'new' || (photo.kind === 'keep' && Boolean(person?.photoPath));
  const roleName = PERSON_ROLES.find((r) => r.value === role)?.label ?? '';

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
        await updatePerson(db, person.id, name, photoPath, role);
        // The old photo file goes only after the database points to the new state
        if (photo.kind !== 'keep' && person.photoPath) deletePersonPhoto(person.photoPath);
      } else {
        await insertPerson(db, name, photoPath, role);
      }
      router.back();
    } catch (error) {
      if (storedPath) deletePersonPhoto(storedPath);
      setSaving(false);
      Alert.alert('Impossibile salvare', String(error));
    }
  }

  return (
    <>
      <ScrollView
        style={styles.screen}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + 36 }]}>
        <View style={styles.bar}>
          <RoundIconButton symbol="chevron.left" accessibilityLabel="Indietro" color={Colors.current.text} onPress={() => router.back()} />
          <Text style={styles.heading} accessibilityRole="header">
            {person ? 'Modifica persona' : 'Nuova persona'}
          </Text>
          <View style={styles.barSpace} />
        </View>

        <View style={styles.photoRow}>
          <Pressable
            onPress={changePhoto}
            accessibilityRole="button"
            accessibilityLabel={hasPhoto ? 'Cambia foto' : 'Aggiungi foto'}
            style={({ pressed }) => [styles.photo, !hasPhoto && styles.photoEmpty, pressed && styles.pressed]}>
            {hasPhoto ? (
              <PersonAvatar
                name={name}
                photoPath={photo.kind === 'keep' ? person?.photoPath : null}
                photoUri={photo.kind === 'new' ? photo.uri : null}
                size={112}
              />
            ) : (
              <>
                <SymbolView name="camera" tintColor={Colors.current.indigo} size={26} />
                <Text style={styles.photoLabel}>Aggiungi foto</Text>
              </>
            )}
          </Pressable>
        </View>

        <Text style={styles.section}>Nome</Text>
        <View style={styles.field}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Come si chiama?"
            placeholderTextColor={Colors.current.placeholder}
            autoFocus={!person}
            autoCapitalize="words"
            returnKeyType="done"
            accessibilityLabel="Nome"
            style={styles.input}
          />
        </View>

        <Text style={styles.section}>Chi è</Text>
        <Pressable
          onPress={() => setRolesOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Chi è per te: ${roleName}`}
          style={({ pressed }) => [styles.field, styles.select, pressed && styles.pressed]}>
          <Text style={styles.selectText}>{roleName}</Text>
          <SymbolView name="chevron.down" tintColor={Colors.current.textSecondary} size={15} weight="semibold" />
        </Pressable>

        <Text style={styles.note}>
          Il profilo resta su questo telefono. Ti serve per tenere in ordine i documenti di ognuno.
        </Text>

        <PrimaryButton
          label={person ? 'Salva' : 'Aggiungi alla famiglia'}
          disabled={!canSave}
          onPress={save}
          style={styles.save}
        />
      </ScrollView>

      <ActionSheet
        visible={rolesOpen}
        title="Chi è per te"
        actions={PERSON_ROLES.map((r) => ({
          key: r.value,
          label: r.label,
          symbol: r.value === role ? 'checkmark.circle.fill' : 'circle',
          onPress: () => setRole(r.value),
        }))}
        onClose={() => setRolesOpen(false)}
      />
    </>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.current.background,
  },
  page: {
    paddingTop: 24,
    paddingHorizontal: Spacing.side,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 17,
    fontFamily: FONTS.semiBold,
    color: Colors.current.text,
  },
  barSpace: {
    width: 44,
  },
  photoRow: {
    marginTop: 20,
    alignItems: 'center',
  },
  photo: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoEmpty: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.current.dashed,
    backgroundColor: Colors.current.paleLilac,
  },
  photoLabel: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: Colors.current.indigo,
  },
  pressed: {
    opacity: 0.7,
  },
  section: {
    marginTop: 22,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: Colors.current.textSecondary,
  },
  field: {
    ...CardSurface,
    marginTop: 10,
    height: 56,
    borderRadius: 18,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: Colors.current.text,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: Colors.current.text,
  },
  note: {
    marginTop: 18,
    marginHorizontal: 4,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
  },
  save: {
    marginTop: 26,
  },
}));
