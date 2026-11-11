import { Host, Picker, Switch } from '@expo/ui';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FieldLabel, FormField, TextField } from '@/components/form-field';
import { GradientButton } from '@/components/gradient-button';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR, FONTS } from '@/constants/brand';
import { listCategories } from '@/db/categories';
import type { DocumentInput } from '@/db/documents';
import type { Category } from '@/db/types';
import { listPeople } from '@/db/people';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { formatShortDate, parseISODate, toISODate } from '@/utils/dates';

// Picker values must be string | number, so 0 stands for "nothing chosen" (ids start at 1)
const NONE = 0;

const REMINDER_OPTIONS = [
  { label: 'Nessuno', value: NONE },
  { label: '1 giorno prima', value: 1 },
  { label: '7 giorni prima', value: 7 },
  { label: '15 giorni prima', value: 15 },
  { label: '30 giorni prima', value: 30 },
  { label: '60 giorni prima', value: 60 },
  { label: '90 giorni prima', value: 90 },
];

type Props = {
  initial?: Partial<DocumentInput>; // empty for a new document, the saved values when editing
  // Attachments area shown at the top; gets the chosen category (labels depend on it)
  files?: (category: Category | undefined) => ReactNode;
  autoFocusTitle?: boolean;
  // `password`: typed in the "Password" field (only for the Password category), null = unchanged.
  // It never goes into DocumentInput, so it can't reach SQLite by mistake.
  onSubmit: (input: DocumentInput, password: string | null) => Promise<void>;
  hasSavedPassword?: boolean; // editing a Password document that already has one in the Keychain
};

// The document form, shared by "Nuovo documento" and "Modifica documento".
// Required: title and category. Everything else is optional.
export function DocumentForm({ initial, files, autoFocusTitle = false, onSubmit, hasSavedPassword = false }: Props) {
  const theme = useTheme();
  const { data: categories } = useDbQuery(listCategories, []);
  const { data: people } = useDbQuery(listPeople, []);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? NONE);
  const [personId, setPersonId] = useState(initial?.personId ?? NONE);
  const [number, setNumber] = useState(initial?.number ?? '');
  const [hasExpiry, setHasExpiry] = useState(Boolean(initial?.expiresAt));
  const [expiryDate, setExpiryDate] = useState(() =>
    initial?.expiresAt ? parseISODate(initial.expiresAt) : new Date(),
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [reminderDays, setReminderDays] = useState(initial?.reminderDays ?? NONE);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [username, setUsername] = useState(initial?.username ?? '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const missing = [
    title.trim().length === 0 && 'Titolo',
    categoryId === NONE && 'Categoria',
  ].filter((field): field is string => Boolean(field));
  const canSave = missing.length === 0 && !saving;

  const isPassword = Boolean(categories?.find((c) => c.id === categoryId)?.isPassword);

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSubmit(
        {
          title,
          categoryId,
          personId: personId === NONE ? null : personId,
          number,
          expiresAt: hasExpiry ? toISODate(expiryDate) : null,
          reminderDays: hasExpiry && reminderDays !== NONE ? reminderDays : null,
          notes,
          username: isPassword ? username : null,
        },
        isPassword && password.length > 0 ? password : null,
      );
    } catch (error) {
      setSaving(false);
      Alert.alert('Impossibile salvare', error instanceof Error ? error.message : String(error));
    }
  }

  const line = theme.backgroundSelected;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={styles.content}>
      {files?.(categories?.find((c) => c.id === categoryId))}

      <FormField label="Titolo" required>
        <TextField
          value={title}
          onChangeText={setTitle}
          placeholder="Es. Carta d'identità"
          autoFocus={autoFocusTitle}
          returnKeyType="done"
        />
      </FormField>

      {/* The pickers need the lists from the database, so they appear once loaded */}
      {categories && people && (
        <>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <FormRow label="Categoria" required>
              <Picker selectedValue={categoryId} onValueChange={setCategoryId}>
                {/* "Scegli…" disappears once a category is chosen */}
                {categoryId === NONE && <Picker.Item label="Scegli…" value={NONE} />}
                {categories.map((c) => (
                  <Picker.Item key={c.id} label={c.name} value={c.id} />
                ))}
              </Picker>
            </FormRow>
          </View>

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            Facoltativi
          </ThemedText>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <FormRow label="Persona">
              <Picker selectedValue={personId} onValueChange={setPersonId}>
                <Picker.Item label="Nessuna" value={NONE} />
                {people.map((p) => (
                  <Picker.Item key={p.id} label={p.name} value={p.id} />
                ))}
              </Picker>
            </FormRow>

            <FormRow label="Aggiungi una scadenza" separator={line}>
              <Switch
                value={hasExpiry}
                onValueChange={(value) => {
                  setHasExpiry(value);
                  setCalendarOpen(value); // turning it on shows the calendar straight away
                }}
              />
            </FormRow>

            {hasExpiry && (
              <>
                {/* The date as text on the right (always inside the margins); tapping it opens
                    the native calendar below, full width inside the card */}
                <Pressable
                  onPress={() => setCalendarOpen((open) => !open)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: calendarOpen }}
                  style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: line }]}>
                  <FieldLabel label="Data di scadenza" />
                  <Text style={styles.dateValue}>{formatShortDate(toISODate(expiryDate))}</Text>
                </Pressable>
                {calendarOpen && (
                  // Not inside another Host: this component creates its own, sized to the card
                  <DateTimePicker
                    value={expiryDate}
                    onValueChange={(_, date) => setExpiryDate(date)}
                    mode="date"
                    display="inline"
                    accentColor={BRAND_COLOR}
                    style={styles.calendar}
                  />
                )}
                <FormRow label="Promemoria" separator={line}>
                  <Picker selectedValue={reminderDays} onValueChange={setReminderDays}>
                    {REMINDER_OPTIONS.map((o) => (
                      <Picker.Item key={o.value} label={o.label} value={o.value} />
                    ))}
                  </Picker>
                </FormRow>
              </>
            )}
          </View>

          {isPassword && (
            <>
              <FormField label="Utente">
                <TextField
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Es. nome@esempio.it"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="none"
                />
              </FormField>
              <FormField label="Password">
                <TextField
                  value={password}
                  onChangeText={setPassword}
                  placeholder={hasSavedPassword ? '•••••••• (lascia vuoto per non cambiarla)' : 'Password'}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="none" // no iOS "save password" prompt: it is not this app's login
                />
              </FormField>
              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionTitle}>
                La password resta solo nel Portachiavi dell&apos;iPhone.
              </ThemedText>
            </>
          )}

          <FormField label="Numero del documento">
            <TextField value={number} onChangeText={setNumber} placeholder="Es. CA12345AB" autoCapitalize="characters" />
          </FormField>

          <FormField label="Note">
            <TextField
              value={notes}
              onChangeText={setNotes}
              placeholder="Es. Rinnovo in Comune"
              multiline
              style={styles.notes}
            />
          </FormField>
        </>
      )}

      <View style={styles.footer}>
        <GradientButton label="Salva" disabled={!canSave} onPress={submit} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          {missing.length > 0 ? `Per salvare compila: ${missing.join(' e ')}.` : '* Campo obbligatorio'}
        </ThemedText>
      </View>
    </ScrollView>
  );
}

type FormRowProps = {
  label: string;
  required?: boolean;
  separator?: string; // color of the line above the row (omitted on the first row)
  children: ReactNode;
};

// One row of a grouped card: label on the left, native control on the right
function FormRow({ label, required, separator, children }: FormRowProps) {
  return (
    <View style={[styles.row, separator && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: separator }]}>
      <View style={styles.rowLabel}>
        <FieldLabel label={label} required={required} />
      </View>
      {/* Host is the bridge between React Native and the native SwiftUI controls.
          The wrapper keeps it inside the card even with a long value. */}
      <View style={styles.rowControl}>
        <Host matchContents>{children}</Host>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
    marginBottom: -12, // closer to its card than to the card above
  },
  card: {
    borderRadius: 12,
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
  rowLabel: {
    flexShrink: 1, // a long label wraps instead of pushing the control out
  },
  rowControl: {
    flexShrink: 1,
    maxWidth: '65%',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  dateValue: {
    color: BRAND_COLOR,
    fontSize: 17,
    fontFamily: FONTS.titleMedium,
  },
  calendar: {
    alignSelf: 'stretch', // full width of the card, never past its margins
    marginBottom: 8,
  },
  notes: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  footer: {
    gap: 8,
  },
  note: {
    textAlign: 'center',
  },
});
