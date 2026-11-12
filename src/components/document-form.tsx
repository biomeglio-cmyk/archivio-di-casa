import { Host, Picker } from '@expo/ui';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { CoverField } from '@/components/cover-field';
import { FieldLabel, FormField, TextField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { Switch } from '@/components/switch';
import { ThemedText } from '@/components/themed-text';
import { WhiteCard } from '@/components/white-card';
import { BRAND_COLOR } from '@/constants/brand';
import { EVERY_OPTIONS, reminderChoices, reminderLabel, reminderPickerValue, reminderToSave } from '@/constants/deadline-options';
import { Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { listCategories } from '@/db/categories';
import type { DocumentInput } from '@/db/documents';
import type { Category, CoverMode } from '@/db/types';
import { listPeople } from '@/db/people';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/settings/preferences';
import { formatShortDate, parseISODate, toISODate } from '@/utils/dates';
import { REPEAT_UNITS, unitName, type RepeatUnit } from '@/utils/recurrence';

// Picker values must be string | number, so 0 stands for "nothing chosen" (ids start at 1)
const NONE = 0;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);


type Props = {
  initial?: Partial<DocumentInput>; // empty for a new document, the saved values when editing
  // Attachments area shown at the top; gets the chosen category (labels depend on it)
  files?: (category: Category | undefined) => ReactNode;
  autoFocusTitle?: boolean;
  // `password`: typed in the "Password" field (only for the Password category), null = unchanged.
  // It never goes into DocumentInput, so it can't reach SQLite by mistake.
  onSubmit: (input: DocumentInput, password: string | null) => Promise<void>;
  hasSavedPassword?: boolean; // editing a Password document that already has one in the Keychain
  hasPhoto?: boolean; // the pages include a photo: "Copertina" defaults to Foto
};

// The document form, shared by "Nuovo documento" and "Modifica documento".
// Required: title and category. Everything else is optional.
export function DocumentForm({
  initial,
  files,
  autoFocusTitle = false,
  onSubmit,
  hasSavedPassword = false,
  hasPhoto = false,
}: Props) {
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
  const [reminderDays, setReminderDays] = useState(reminderPickerValue(initial?.reminderDays ?? null));
  const { defaultReminderDays } = usePreferences();
  // "Si ripete": 'never' or a unit, and every how many (kept while switching back and forth)
  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit | 'never'>(initial?.repeat?.unit ?? 'never');
  const [repeatEvery, setRepeatEvery] = useState(initial?.repeat?.every ?? 1);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [username, setUsername] = useState(initial?.username ?? '');
  const [password, setPassword] = useState('');
  // null = automatic: Foto when there is a photo, else Colore (decided again at every save)
  const [coverMode, setCoverMode] = useState<CoverMode | null>(initial?.coverMode ?? null);
  const [coverColor, setCoverColor] = useState<string | null>(initial?.coverColor ?? null);
  const [saving, setSaving] = useState(false);

  const missing = [
    title.trim().length === 0 && 'Titolo',
    categoryId === NONE && 'Categoria',
  ].filter((field): field is string => Boolean(field));
  const canSave = missing.length === 0 && !saving;

  const selectedCategory = categories?.find((c) => c.id === categoryId);
  const isPassword = Boolean(selectedCategory?.isPassword);

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
          reminderDays: hasExpiry ? reminderToSave(reminderDays) : null,
          repeat: hasExpiry && repeatUnit !== 'never' ? { every: repeatEvery, unit: repeatUnit } : null,
          notes,
          username: isPassword ? username : null,
          coverMode,
          coverColor,
        },
        isPassword && password.length > 0 ? password : null,
      );
    } catch (error) {
      setSaving(false);
      Alert.alert('Impossibile salvare', error instanceof Error ? error.message : String(error));
    }
  }

  const line = theme.backgroundSelected;

  function toggleExpiry(value: boolean) {
    setHasExpiry(value);
    setCalendarOpen(value); // turning it on shows the calendar straight away
  }

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
          <WhiteCard style={styles.card}>
            <FormRow label="Categoria" required>
              <Picker selectedValue={categoryId} onValueChange={setCategoryId}>
                {/* "Scegli…" disappears once a category is chosen */}
                {categoryId === NONE && <Picker.Item label="Scegli…" value={NONE} />}
                {categories.map((c) => (
                  <Picker.Item key={c.id} label={c.name} value={c.id} />
                ))}
              </Picker>
            </FormRow>
          </WhiteCard>

          <CoverField
            mode={coverMode ?? (hasPhoto ? 'photo' : 'color')}
            onModeChange={setCoverMode}
            color={coverColor}
            onColorChange={setCoverColor}
            categoryColors={selectedCategory?.colors}
            hasPhoto={hasPhoto}
          />

          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            Facoltativi
          </ThemedText>
          <WhiteCard style={styles.card}>
            <FormRow label="Persona">
              <Picker selectedValue={personId} onValueChange={setPersonId}>
                <Picker.Item label="Nessuna" value={NONE} />
                {people.map((p) => (
                  <Picker.Item key={p.id} label={p.name} value={p.id} />
                ))}
              </Picker>
            </FormRow>

            {/* Every category can have a deadline (only cards, which have their own form, don't).
                The whole row toggles it, not just the switch. */}
            <FormRow label="Aggiungi una scadenza" separator={line} onPress={() => toggleExpiry(!hasExpiry)}>
              <Switch value={hasExpiry} onValueChange={toggleExpiry} accessibilityLabel="Aggiungi una scadenza" />
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
                {/* "Si ripete": Mai, or every N (1-99) days / weeks / months / years */}
                <FormRow label="Si ripete" separator={line}>
                  <Picker selectedValue={repeatUnit} onValueChange={setRepeatUnit}>
                    <Picker.Item label="Mai" value="never" />
                    {REPEAT_UNITS.map((unit) => (
                      <Picker.Item key={unit} label={capitalize(unitName(unit, 2))} value={unit} />
                    ))}
                  </Picker>
                </FormRow>
                {repeatUnit !== 'never' && (
                  <FormRow label="Ogni" separator={line}>
                    <Picker selectedValue={repeatEvery} onValueChange={setRepeatEvery}>
                      {EVERY_OPTIONS.map((n) => (
                        <Picker.Item key={n} label={`${n} ${unitName(repeatUnit, n)}`} value={n} />
                      ))}
                    </Picker>
                  </FormRow>
                )}
                <FormRow label="Promemoria" separator={line}>
                  <Picker selectedValue={reminderDays} onValueChange={setReminderDays}>
                    {reminderChoices(reminderDays).map((days) => (
                      <Picker.Item key={days} label={reminderLabel(days, defaultReminderDays)} value={days} />
                    ))}
                  </Picker>
                </FormRow>
              </>
            )}
          </WhiteCard>

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
        <PrimaryButton label="Salva" disabled={!canSave} onPress={submit} />
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
  // The row holds a React Native control (our Switch), not a native SwiftUI one: no Host, never
  // clipped, and a tap anywhere on the row runs onPress
  onPress?: () => void;
  children: ReactNode;
};

// One row of a grouped card: label on the left, native control on the right
function FormRow({ label, required, separator, onPress, children }: FormRowProps) {
  const style = [styles.row, separator && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: separator }];
  const labelView = (
    <View style={styles.rowLabel}>
      <FieldLabel label={label} required={required} />
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessible={false} style={style}>
        {labelView}
        <View style={styles.rowSwitch}>{children}</View>
      </Pressable>
    );
  }
  return (
    <View style={style}>
      {labelView}
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
    paddingVertical: 16,
    paddingHorizontal: Spacing.side,
    paddingBottom: 40,
    gap: 20,
  },
  sectionTitle: {
    textTransform: 'uppercase', // +0.1em letter spacing from the app Text
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
  rowSwitch: {
    flexShrink: 0, // the switch keeps its size and is never clipped
  },
  dateValue: {
    color: BRAND_COLOR,
    fontSize: 17,
    fontFamily: FONTS.medium,
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
