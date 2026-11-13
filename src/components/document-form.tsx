import { router } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverField } from '@/components/cover-field';
import { DateCalendar } from '@/components/date-calendar';
import { FitLine } from '@/components/fit-line';
import { PrimaryButton } from '@/components/primary-button';
import { RoundIconButton } from '@/components/round-icon-button';
import { Segmented } from '@/components/segmented';
import { Switch } from '@/components/switch';
import { Text, TextInput } from '@/components/text';
import { WhiteCard } from '@/components/white-card';
import {
  EVERY_OPTIONS,
  reminderChoices,
  reminderChoiceLabel,
  reminderLabel,
  reminderPickerValue,
  reminderToSave,
} from '@/constants/deadline-options';
import { typeSuggestions } from '@/constants/document-types';
import { Colors, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { listCategories } from '@/db/categories';
import { listDocumentTypes, type DocumentInput } from '@/db/documents';
import { listPeople } from '@/db/people';
import type { Category, CoverMode, PaymentStatus } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { usePreferences } from '@/settings/preferences';
import { chooseAction } from '@/utils/action-sheet';
import { categoryTint } from '@/utils/colors';
import { MONTHS, parseISODate, toISODate } from '@/utils/dates';
import { centsToInput, parseEuro } from '@/utils/money';
import { REPEAT_UNITS, unitName, type RepeatUnit } from '@/utils/recurrence';
import { PIN_TINT } from '@/constants/brand';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const PIN_BACKGROUND = PIN_TINT;
const PIN_COLOR = Colors.current.heart;
const STATUSES: { label: string; value: PaymentStatus | null }[] = [
  { label: 'Nessuno', value: null },
  { label: 'Da pagare', value: 'due' },
  { label: 'Pagata', value: 'paid' },
];

export type FormExtras = { pinned: boolean };

type Props = {
  heading: string; // "Modifica documento", "Nuovo documento"
  initial?: Partial<DocumentInput>; // empty for a new document, the saved values when editing
  initialPinned?: boolean;
  // Pages area shown at the top; gets the chosen category (labels depend on it)
  files?: (category: Category | undefined) => ReactNode;
  autoFocusTitle?: boolean;
  // `password`: typed in the "Password" field (only for the Password category), null = unchanged.
  // It never goes into DocumentInput, so it can't reach SQLite by mistake.
  onSubmit: (input: DocumentInput, password: string | null, extras: FormExtras) => Promise<void>;
  onDelete?: () => void; // "Cancella documento" (only when editing)
  hasSavedPassword?: boolean; // editing a Password document that already has one in the Keychain
  hasPhoto?: boolean; // the pages include a photo: "Copertina" defaults to Foto
  notice?: ReactNode; // under the pages: "Letto dal documento" after a capture (Conferma design)
};

// "Modifica documento" / "Nuovo documento" (docs/design/Modifica.dc.html): back button and title,
// the pages (3-column grid), NOME, DOVE SALVARLO (Cartella, Persona), SCADENZA (switch, calendar,
// Avvisami), NOTE, "Aggiungi ai preferiti", "Salva modifiche" and "Cancella documento"; the same
// order as Conferma.dc.html for a new document after a capture (with "Letto dal documento").
// Our extras come after the design's fields, so its order stays unbroken.
// Our extras, added where they fit: Tipo in DOVE SALVARLO; Si ripete in SCADENZA; IMPORTO E STATO;
// COPERTINA; Utente and Password for the "Password" category; the document number.
// Required: name and folder.
export function DocumentForm({
  heading,
  initial,
  initialPinned = false,
  files,
  autoFocusTitle = false,
  onSubmit,
  onDelete,
  hasSavedPassword = false,
  hasPhoto = false,
  notice,
}: Props) {
  const insets = useSafeAreaInsets();
  const { data: categories } = useDbQuery(listCategories, []);
  const { data: people } = useDbQuery(listPeople, []);
  const { defaultReminderDays } = usePreferences();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [categoryId, setCategoryId] = useState<number | null>(initial?.categoryId ?? null);
  const [chosenPerson, setPersonId] = useState<number | null>(initial?.personId ?? null);
  // A new document without a person follows the "Per chi è" of its category until one is chosen
  const [personTouched, setPersonTouched] = useState(onDelete !== undefined || initial?.personId != null);
  const [docType, setDocType] = useState<string | null>(initial?.docType ?? null);
  const [number, setNumber] = useState(initial?.number ?? '');
  const [hasExpiry, setHasExpiry] = useState(Boolean(initial?.expiresAt));
  const [expiryDate, setExpiryDate] = useState(() =>
    initial?.expiresAt ? parseISODate(initial.expiresAt) : new Date(),
  );
  const [reminderDays, setReminderDays] = useState(reminderPickerValue(initial?.reminderDays ?? null));
  // "Si ripete": 'never' or a unit, and every how many (kept while switching back and forth)
  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit | 'never'>(initial?.repeat?.unit ?? 'never');
  const [repeatEvery, setRepeatEvery] = useState(initial?.repeat?.every ?? 1);
  const [amount, setAmount] = useState(centsToInput(initial?.amountCents ?? null));
  const [status, setStatus] = useState<PaymentStatus | null>(initial?.paymentStatus ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [pinned, setPinned] = useState(initialPinned);
  const [username, setUsername] = useState(initial?.username ?? '');
  const [password, setPassword] = useState('');
  // null = automatic: Foto when there is a photo, else Colore (decided again at every save)
  const [coverMode, setCoverMode] = useState<CoverMode | null>(initial?.coverMode ?? null);
  const [coverColor, setCoverColor] = useState<string | null>(initial?.coverColor ?? null);
  const [saving, setSaving] = useState(false);
  const [wheelDragging, setWheelDragging] = useState(false); // a finger on the color wheel: no scroll

  const selectedCategory = categories?.find((c) => c.id === categoryId);
  const personId = personTouched ? chosenPerson : (selectedCategory?.personId ?? null);
  const { data: usedTypes } = useDbQuery(
    (db) => (categoryId === null ? Promise.resolve([]) : listDocumentTypes(db, categoryId)),
    [categoryId],
  );
  const isPassword = Boolean(selectedCategory?.isPassword);
  const amountCents = parseEuro(amount);
  const amountInvalid = amount.trim().length > 0 && amountCents === null;

  const missing = [title.trim().length === 0 && 'il nome', categoryId === null && 'la cartella'].filter(
    (field): field is string => Boolean(field),
  );
  const canSave = missing.length === 0 && !amountInvalid && !saving;
  const tint = selectedCategory ? categoryTint(selectedCategory.colors) : null;

  async function submit() {
    if (!canSave || categoryId === null) return;
    setSaving(true);
    try {
      await onSubmit(
        {
          title,
          categoryId,
          personId,
          number,
          expiresAt: hasExpiry ? toISODate(expiryDate) : null,
          reminderDays: hasExpiry ? reminderToSave(reminderDays) : null,
          repeat: hasExpiry && repeatUnit !== 'never' ? { every: repeatEvery, unit: repeatUnit } : null,
          notes,
          username: isPassword ? username : null,
          coverMode,
          coverColor,
          docType,
          paymentStatus: status,
          amountCents,
        },
        isPassword && password.length > 0 ? password : null,
        { pinned },
      );
    } catch (error) {
      setSaving(false);
      Alert.alert('Impossibile salvare', error instanceof Error ? error.message : String(error));
    }
  }

  async function chooseCategory() {
    if (!categories) return;
    const index = await chooseAction(
      'Cartella',
      categories.map((c) => c.name),
    );
    if (index === null) return;
    const next = categories[index];
    if (next.id !== categoryId) setDocType(null); // a Tipo belongs to its folder
    setCategoryId(next.id);
  }

  async function choosePerson() {
    if (!people) return;
    const index = await chooseAction('Persona', ['Tutta la famiglia', ...people.map((p) => p.name)]);
    if (index === null) return;
    setPersonTouched(true);
    setPersonId(index === 0 ? null : people[index - 1].id);
  }

  async function chooseType() {
    const options = typeSuggestions(selectedCategory?.builtinKey ?? null, usedTypes ?? []);
    const labels = [...options, 'Scrivi un altro tipo…', ...(docType ? ['Nessun tipo'] : [])];
    const index = await chooseAction('Tipo', labels);
    if (index === null) return;
    if (index < options.length) setDocType(options[index]);
    else if (labels[index] === 'Nessun tipo') setDocType(null);
    else {
      Alert.prompt(
        'Tipo',
        'Per esempio: Luce, Bollo, Dentista',
        (value) => setDocType(value.trim() || null),
        'plain-text',
        docType ?? '',
      );
    }
  }

  async function chooseFrom<T>(titleText: string, values: T[], labelOf: (value: T) => string, set: (value: T) => void) {
    const index = await chooseAction(titleText, values.map(labelOf));
    if (index !== null) set(values[index]);
  }

  const dueText = hasExpiry
    ? `Il ${expiryDate.getDate()} ${MONTHS[expiryDate.getMonth()]} ${expiryDate.getFullYear()}`
    : 'Nessuna scadenza';

  return (
    <ScrollView
      style={styles.screen}
      scrollEnabled={!wheelDragging}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 36 }]}>
      <View style={styles.header}>
        <RoundIconButton symbol="chevron.left" accessibilityLabel="Indietro" onPress={() => router.back()} />
        <Text style={styles.heading} accessibilityRole="header" numberOfLines={1}>
          {heading}
        </Text>
        <View style={styles.headerSpace} />
      </View>

      <View style={styles.pages}>{files?.(selectedCategory)}</View>
      {notice}

      <SectionTitle>Nome</SectionTitle>
      <View style={styles.nameField}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Nome del documento"
          placeholderTextColor={Colors.current.placeholder}
          autoFocus={autoFocusTitle}
          returnKeyType="done"
          accessibilityLabel="Nome del documento"
          style={styles.nameInput}
        />
      </View>

      {categories && people && (
        <>
          <SectionTitle>Dove salvarlo</SectionTitle>
          <WhiteCard style={styles.card}>
            <FieldRow
              symbol="folder"
              tint={tint?.tint ?? Colors.current.lilac}
              iconColor={tint?.onTint ?? Colors.current.indigo}
              label="Cartella">
              <SelectBox
                value={selectedCategory?.name ?? 'Scegli…'}
                placeholder={!selectedCategory}
                onPress={chooseCategory}
                accessibilityLabel="Cartella"
              />
            </FieldRow>
            <Separator />
            <FieldRow symbol="person" tint={Colors.current.lilac} iconColor={Colors.current.indigo} label="Persona">
              <SelectBox
                value={people.find((p) => p.id === personId)?.name ?? 'Tutta la famiglia'}
                onPress={choosePerson}
                accessibilityLabel="Persona"
              />
            </FieldRow>
            <Separator />
            <FieldRow symbol="tag" tint={Colors.current.paleLilac} iconColor={Colors.current.indigo} label="Tipo">
              <SelectBox
                value={docType ?? 'Nessuno'}
                placeholder={!docType}
                onPress={chooseType}
                accessibilityLabel="Tipo"
              />
            </FieldRow>
          </WhiteCard>

          <SectionTitle>Scadenza</SectionTitle>
          <WhiteCard style={styles.card}>
            <Pressable onPress={() => setHasExpiry(!hasExpiry)} accessible={false} style={styles.switchRow}>
              <IconBox symbol="calendar" tint={Colors.current.lilac} color={Colors.current.indigo} />
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>Aggiungi scadenza</Text>
                <Text style={styles.rowSubtitle}>{dueText}</Text>
              </View>
              <Switch value={hasExpiry} onValueChange={setHasExpiry} accessibilityLabel="Aggiungi scadenza" />
            </Pressable>
            {hasExpiry && (
              <View style={styles.dueBox}>
                <DateCalendar value={expiryDate} onChange={setExpiryDate} />
                <View style={styles.remind}>
                  <IconBox symbol="bell" tint={Colors.current.surface} color={Colors.current.indigo} />
                  <FitLine
                    start={<Text style={styles.remindLabel}>Avvisami</Text>}
                    end={
                      <SelectBox
                        small
                        value={reminderLabel(reminderDays, defaultReminderDays)}
                        accessibilityLabel="Quando avvisarti"
                        onPress={() =>
                          chooseFrom(
                            'Avvisami',
                            reminderChoices(reminderDays),
                            (d) => reminderChoiceLabel(d, defaultReminderDays),
                            setReminderDays,
                          )
                        }
                      />
                    }
                  />
                </View>
                {/* Ours: a deadline that comes back */}
                <View style={styles.remind}>
                  <IconBox symbol="arrow.clockwise" tint={Colors.current.surface} color={Colors.current.indigo} />
                  <FitLine
                    start={<Text style={styles.remindLabel}>Si ripete</Text>}
                    end={
                      <SelectBox
                        small
                        value={repeatUnit === 'never' ? 'Mai' : `Ogni ${repeatEvery} ${unitName(repeatUnit, repeatEvery)}`}
                        accessibilityLabel="Si ripete"
                        onPress={() =>
                          chooseFrom<RepeatUnit | 'never'>(
                            'Si ripete',
                            ['never', ...REPEAT_UNITS],
                            (unit) => (unit === 'never' ? 'Mai' : capitalize(unitName(unit, 2))),
                            setRepeatUnit,
                          )
                        }
                      />
                    }
                  />
                </View>
                {repeatUnit !== 'never' && (
                  <View style={styles.remind}>
                    <IconBox symbol="number" tint={Colors.current.surface} color={Colors.current.indigo} />
                    <FitLine
                      start={<Text style={styles.remindLabel}>Ogni</Text>}
                      end={
                        <SelectBox
                          small
                          value={`${repeatEvery} ${unitName(repeatUnit, repeatEvery)}`}
                          accessibilityLabel="Ogni"
                          onPress={() =>
                            chooseFrom(
                              'Ogni',
                              EVERY_OPTIONS.slice(0, 31),
                              (n) => `${n} ${unitName(repeatUnit, n)}`,
                              setRepeatEvery,
                            )
                          }
                        />
                      }
                    />
                  </View>
                )}
              </View>
            )}
          </WhiteCard>

          <SectionTitle>Note</SectionTitle>
          <WhiteCard style={styles.notesCard}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Per esempio: pagata con domiciliazione, chiedere il rimborso…"
              placeholderTextColor={Colors.current.placeholder}
              multiline
              accessibilityLabel="Note"
              style={styles.notes}
            />
          </WhiteCard>

          <WhiteCard style={[styles.card, styles.pinCard]}>
            <Pressable onPress={() => setPinned(!pinned)} accessible={false} style={styles.switchRow}>
              <IconBox symbol={pinned ? 'heart.fill' : 'heart'} tint={PIN_BACKGROUND} color={PIN_COLOR} />
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>Aggiungi ai preferiti</Text>
                <Text style={styles.rowSubtitle}>Lo trovi subito in home</Text>
              </View>
              <Switch value={pinned} onValueChange={setPinned} accessibilityLabel="Aggiungi ai preferiti" />
            </Pressable>
          </WhiteCard>

          {/* Ours: what it costs and whether it is paid */}
          <SectionTitle>Importo e stato</SectionTitle>
          <WhiteCard style={styles.card}>
            <FieldRow
              symbol="eurosign"
              tint={Colors.current.successBackground}
              iconColor={Colors.current.success}
              label="Importo">
              <View style={[styles.select, amountInvalid && styles.selectError]}>
                <Text style={styles.euro}>€</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0,00"
                  placeholderTextColor={Colors.current.placeholder}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Importo in euro"
                  style={styles.amountInput}
                />
              </View>
            </FieldRow>
            <View style={styles.statusRow}>
              <Segmented
                values={STATUSES.map((s) => s.label)}
                selectedIndex={STATUSES.findIndex((s) => s.value === status)}
                onChange={(index) => setStatus(STATUSES[index].value)}
              />
            </View>
          </WhiteCard>

          {/* Ours: how it looks in the grids */}
          <View style={styles.extra}>
            <CoverField
              mode={coverMode ?? (hasPhoto ? 'photo' : 'color')}
              onModeChange={setCoverMode}
              color={coverColor}
              onColorChange={setCoverColor}
              categoryColors={selectedCategory?.colors}
              hasPhoto={hasPhoto}
              onDraggingChange={setWheelDragging}
            />
          </View>

          {/* Ours: user name and password of the "Password" category (the password only in the Keychain) */}
          {isPassword && (
            <>
              <SectionTitle>Accesso</SectionTitle>
              <WhiteCard style={styles.card}>
                <FieldRow
                  symbol="person.crop.circle"
                  tint={Colors.current.lilac}
                  iconColor={Colors.current.indigo}
                  label="Utente">
                  <View style={styles.select}>
                    <TextInput
                      value={username}
                      onChangeText={setUsername}
                      placeholder="nome@esempio.it"
                      placeholderTextColor={Colors.current.placeholder}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="none"
                      accessibilityLabel="Utente"
                      style={styles.fieldInput}
                    />
                  </View>
                </FieldRow>
                <Separator />
                <FieldRow symbol="key" tint={Colors.current.lilac} iconColor={Colors.current.indigo} label="Password">
                  <View style={styles.select}>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder={hasSavedPassword ? '•••••••• (invariata)' : 'Password'}
                      placeholderTextColor={Colors.current.placeholder}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="none" // no iOS "save password" prompt: it is not this app's login
                      accessibilityLabel="Password"
                      style={styles.fieldInput}
                    />
                  </View>
                </FieldRow>
              </WhiteCard>
              <Text style={styles.note}>La password resta solo nel Portachiavi dell’iPhone.</Text>
            </>
          )}

          {/* Ours: the number printed on the document */}
          <SectionTitle>Numero del documento</SectionTitle>
          <View style={styles.nameField}>
            <TextInput
              value={number ?? ''}
              onChangeText={setNumber}
              placeholder="Es. CA12345AB"
              placeholderTextColor={Colors.current.placeholder}
              autoCapitalize="characters"
              accessibilityLabel="Numero del documento"
              style={styles.nameInput}
            />
          </View>
        </>
      )}

      <View style={styles.save}>
        <PrimaryButton label={onDelete ? 'Salva modifiche' : 'Salva documento'} disabled={!canSave} onPress={submit} />
      </View>
      {(missing.length > 0 || amountInvalid) && (
        <Text style={styles.note}>
          {amountInvalid ? 'Scrivi l’importo come 84,20.' : `Per salvare scrivi ${missing.join(' e scegli ')}.`}
        </Text>
      )}
      {onDelete && (
        <Pressable onPress={onDelete} accessibilityRole="button" style={styles.delete}>
          <Text style={styles.deleteText}>Cancella documento</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={styles.sectionTitle} accessibilityRole="header">
      {children}
    </Text>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function IconBox({ symbol, tint, color }: { symbol: SFSymbol; tint: string; color: string }) {
  return (
    <View style={[styles.iconBox, { backgroundColor: tint }]}>
      <SymbolView name={symbol} tintColor={color} size={19} />
    </View>
  );
}

// "Cartella   [Bollette ⌄]": icon square, a 72pt grey label, then the control
function FieldRow({
  symbol,
  tint,
  iconColor,
  label,
  children,
}: {
  symbol: SFSymbol;
  tint: string;
  iconColor: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.fieldRow}>
      <IconBox symbol={symbol} tint={tint} color={iconColor} />
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.flex}>{children}</View>
    </View>
  );
}

// A drop-down of the design: pale lilac (white when small, on pale lilac) with the value and ⌄;
// it opens the iOS choice sheet
function SelectBox({
  value,
  onPress,
  accessibilityLabel,
  placeholder = false,
  small = false,
}: {
  value: string;
  onPress: () => void;
  accessibilityLabel: string;
  placeholder?: boolean;
  small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel}, ${value}`}
      style={({ pressed }) => [small ? styles.selectSmall : styles.select, pressed && styles.pressed]}>
      <Text
        style={[small ? styles.selectSmallText : styles.selectText, placeholder && styles.placeholder]}>
        {value}
      </Text>
      <SymbolView name="chevron.down" tintColor={Colors.current.textSecondary} size={13} weight="semibold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.current.background,
  },
  content: {
    paddingHorizontal: Spacing.side,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heading: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: FONTS.semiBold,
    color: Colors.current.text,
  },
  headerSpace: {
    width: 44,
  },
  pages: {
    marginTop: 18,
  },
  sectionTitle: {
    marginTop: 24,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: Colors.current.textSecondary,
  },
  nameField: {
    marginTop: 10,
    minHeight: 56,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: Colors.current.surface,
    boxShadow: '0 6px 22px rgba(28, 30, 70, 0.08)',
    justifyContent: 'center',
  },
  nameInput: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: Colors.current.text,
    paddingVertical: 14,
  },
  card: {
    marginTop: 10,
    paddingVertical: 4,
  },
  pinCard: {
    marginTop: 12,
  },
  separator: {
    height: 1,
    marginLeft: 70,
    marginRight: 16,
    backgroundColor: Colors.current.separator,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  fieldLabel: {
    width: 72,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  select: {
    minHeight: 44,
    paddingLeft: 14,
    paddingRight: 14,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: Colors.current.paleLilac,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectError: {
    borderWidth: 1,
    borderColor: Colors.current.error,
  },
  selectText: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: Colors.current.text,
  },
  selectSmall: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.current.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectSmallText: {
    flexShrink: 1,
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: Colors.current.text,
  },
  placeholder: {
    color: Colors.current.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: Colors.current.text,
    paddingVertical: 10,
  },
  euro: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: Colors.current.textSecondary,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: Colors.current.text,
    paddingVertical: 10,
  },
  statusRow: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: Colors.current.text,
  },
  rowSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
  },
  dueBox: {
    marginTop: 4,
    marginHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.current.separator,
    gap: 8,
  },
  remind: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: Colors.current.paleLilac,
  },
  remindLabel: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: Colors.current.text,
  },
  notesCard: {
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  notes: {
    minHeight: 68,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FONTS.regular,
    color: Colors.current.text,
    textAlignVertical: 'top',
  },
  extra: {
    marginTop: 24,
  },
  note: {
    marginTop: 8,
    paddingHorizontal: 6,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
    textAlign: 'center',
  },
  save: {
    marginTop: 24,
  },
  delete: {
    marginTop: 10,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: Colors.current.error,
  },
});
