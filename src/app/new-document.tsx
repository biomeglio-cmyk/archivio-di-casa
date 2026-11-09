import { Host, Picker, Switch } from '@expo/ui';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useState, type ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { AttachmentStrip } from '@/components/attachment-strip';
import { FormField, TextField } from '@/components/form-field';
import { GradientButton } from '@/components/gradient-button';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR } from '@/constants/brand';
import { listCategories } from '@/db/categories';
import { insertDocument } from '@/db/documents';
import { listPeople } from '@/db/people';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { decodePendingFiles, type PendingFile } from '@/storage/pending-files';
import { toISODate } from '@/utils/dates';

const NO_PERSON = 0; // Picker values must be string | number, so 0 stands for "Nessuna"

// A PDF named "Polizza casa 2026.pdf" suggests the title "Polizza casa 2026"
function suggestTitle(files: PendingFile[]): string {
  const pdf = files.find((f) => f.kind === 'pdf' && f.name);
  return pdf?.name ? pdf.name.replace(/\.pdf$/i, '') : '';
}

// Modal "Nuovo documento": title, category, person, expiry, plus the files captured before (if any)
export default function NewDocumentScreen() {
  const db = useSQLiteContext();
  // Files arrive as a JSON route param from the "+" sheet or from the camera
  const params = useLocalSearchParams<{ files?: string }>();
  const [files] = useState(() => decodePendingFiles(params.files));
  const theme = useTheme();
  const { data: categories } = useDbQuery(listCategories, []);
  const { data: people } = useDbQuery(listPeople, []);

  const [title, setTitle] = useState(() => suggestTitle(files));
  const [categoryId, setCategoryId] = useState<number | null>(null); // null = first category
  const [personId, setPersonId] = useState(NO_PERSON);
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState(() => new Date());
  const [saving, setSaving] = useState(false);

  const selectedCategoryId = categoryId ?? categories?.[0]?.id;
  const canSave = title.trim().length > 0 && selectedCategoryId !== undefined && !saving;

  async function save() {
    if (!canSave || selectedCategoryId === undefined) return;
    setSaving(true);
    try {
      await insertDocument(db, {
        title,
        categoryId: selectedCategoryId,
        personId: personId === NO_PERSON ? null : personId,
        expiresAt: hasExpiry ? toISODate(expiryDate) : null,
      }, files);
      // Scadenze, Archivio and Famiglia update by themselves (useDbQuery listens to changes)
      router.back();
    } catch (error) {
      setSaving(false);
      Alert.alert('Impossibile salvare', String(error));
    }
  }

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>
        {files.length > 0 && <AttachmentStrip files={files} />}

        <FormField label="Titolo">
          <TextField
            value={title}
            onChangeText={setTitle}
            placeholder="Es. Carta d'identità"
            autoFocus={files.length === 0}
            returnKeyType="done"
          />
        </FormField>

        {/* The pickers need the lists from the database, so they appear once loaded */}
        {categories && people && selectedCategoryId !== undefined && (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <FormRow label="Categoria">
              <Picker selectedValue={selectedCategoryId} onValueChange={setCategoryId}>
                {categories.map((c) => (
                  <Picker.Item key={c.id} label={c.name} value={c.id} />
                ))}
              </Picker>
            </FormRow>

            <FormRow label="Persona" separator={theme.backgroundSelected}>
              <Picker selectedValue={personId} onValueChange={setPersonId}>
                <Picker.Item label="Nessuna" value={NO_PERSON} />
                {people.map((p) => (
                  <Picker.Item key={p.id} label={p.name} value={p.id} />
                ))}
              </Picker>
            </FormRow>

            <FormRow label="Ha una scadenza" separator={theme.backgroundSelected}>
              <Switch value={hasExpiry} onValueChange={setHasExpiry} />
            </FormRow>

            {hasExpiry && (
              <FormRow label="Scadenza" separator={theme.backgroundSelected}>
                <DateTimePicker
                  value={expiryDate}
                  onValueChange={(_, date) => setExpiryDate(date)}
                  mode="date"
                  display="compact"
                  accentColor={BRAND_COLOR}
                />
              </FormRow>
            )}
          </View>
        )}

        <GradientButton label="Salva" disabled={!canSave} onPress={save} />
      </ScrollView>

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()}>Annulla</Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

type FormRowProps = {
  label: string;
  separator?: string; // color of the line above the row (omitted on the first row)
  children: ReactNode;
};

// One row of the grouped card: label on the left, native control on the right
function FormRow({ label, separator, children }: FormRowProps) {
  return (
    <View
      style={[
        styles.row,
        separator && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: separator },
      ]}>
      <ThemedText>{label}</ThemedText>
      {/* Host is the bridge between React Native and the native SwiftUI controls */}
      <Host matchContents>{children}</Host>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 20,
  },
  card: {
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 52,
    paddingVertical: 8,
  },
});
