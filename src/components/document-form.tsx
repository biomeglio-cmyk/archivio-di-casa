import { router } from 'expo-router';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
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
import { type Palette, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { listCategories } from '@/db/categories';
import { listDocumentTypes, type DocumentInput } from '@/db/documents';
import { listPeople } from '@/db/people';
import type { Category, CoverMode, PaymentStatus } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { usePreferences } from '@/settings/preferences';
import { chooseAction } from '@/utils/action-sheet';
import { categoryTint } from '@/utils/colors';
import { parseISODate, toISODate } from '@/utils/dates';
import { centsToInput, parseEuro } from '@/utils/money';
import { describeEvery, REPEAT_UNITS, unitCount, unitName, type RepeatUnit } from '@/utils/recurrence';
import { PIN_TINT } from '@/constants/brand';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useFormat } from '@/i18n/use-format';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const PIN_BACKGROUND = (p: Palette) => PIN_TINT(p);
const PIN_COLOR = (p: Palette) => p.heart;
// Translated at render time (labelKey)
const STATUSES: { labelKey: string; value: PaymentStatus | null }[] = [
  { labelKey: 'common.none', value: null },
  { labelKey: 'documentForm.statusDue', value: 'due' },
  { labelKey: 'documentForm.statusPaid', value: 'paid' },
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
  const { t } = useI18n();
  const fmt = useFormat();
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { data: categories } = useDbQuery(listCategories, []);
  const { data: people } = useDbQuery(listPeople, []);
  const { defaultReminderDays } = usePreferences();
  const { fontScale } = useWindowDimensions();

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

  const missingName = title.trim().length === 0;
  const missingFolder = categoryId === null;
  const missing = missingName || missingFolder;
  const canSave = !missing && !amountInvalid && !saving;
  const tint = selectedCategory ? categoryTint(selectedCategory.colors, theme) : null;

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
      Alert.alert(t('documentForm.saveFailed'), error instanceof Error ? error.message : String(error));
    }
  }

  async function chooseCategory() {
    if (!categories) return;
    const index = await chooseAction(
      t('documentForm.folder'),
      categories.map((c) => c.name),
    );
    if (index === null) return;
    const next = categories[index];
    if (next.id !== categoryId) setDocType(null); // a Tipo belongs to its folder
    setCategoryId(next.id);
  }

  async function choosePerson() {
    if (!people) return;
    const index = await chooseAction(t('documentForm.person'), [t('common.wholeFamily'), ...people.map((p) => p.name)]);
    if (index === null) return;
    setPersonTouched(true);
    setPersonId(index === 0 ? null : people[index - 1].id);
  }

  async function chooseType() {
    const options = typeSuggestions(selectedCategory?.builtinKey ?? null, usedTypes ?? []);
    const labels = [...options, t('documentForm.otherType'), ...(docType ? [t('documentForm.noType')] : [])];
    const index = await chooseAction(t('documentForm.type'), labels);
    if (index === null) return;
    if (index < options.length) setDocType(options[index]);
    else if (index === options.length + 1) setDocType(null); // "Nessun tipo"
    else {
      Alert.prompt(
        t('documentForm.type'),
        t('documentForm.typeExample'),
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
    ? t('documentForm.dueOn', { date: `${fmt.dayMonth(expiryDate)} ${expiryDate.getFullYear()}` })
    : t('documentForm.noDeadline');

  return (
    <ScrollView
      style={styles.screen}
      scrollEnabled={!wheelDragging}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 36 }]}>
      <View style={styles.header}>
        <RoundIconButton symbol="chevron.left" accessibilityLabel={t('common.back')} onPress={() => router.back()} />
        <Text style={styles.heading} accessibilityRole="header" numberOfLines={fontScale > 1.3 ? 3 : 1}>
          {heading}
        </Text>
        <View style={styles.headerSpace} />
      </View>

      <View style={styles.pages}>{files?.(selectedCategory)}</View>
      {notice}

      <SectionTitle>{t('documentForm.nameSection')}</SectionTitle>
      <View style={styles.nameField}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('documentForm.namePlaceholder')}
          placeholderTextColor={theme.placeholder}
          autoFocus={autoFocusTitle}
          returnKeyType="done"
          accessibilityLabel={t('documentForm.namePlaceholder')}
          style={styles.nameInput}
        />
      </View>

      {categories && people && (
        <>
          <SectionTitle>{t('documentForm.whereSection')}</SectionTitle>
          <WhiteCard style={styles.card}>
            <FieldRow
              symbol="folder"
              tint={tint?.tint ?? theme.lilac}
              iconColor={tint?.onTint ?? theme.indigo}
              label={t('documentForm.folder')}>
              <SelectBox
                value={selectedCategory?.name ?? t('documentForm.choose')}
                placeholder={!selectedCategory}
                onPress={chooseCategory}
                accessibilityLabel={t('documentForm.folder')}
              />
            </FieldRow>
            <Separator />
            <FieldRow symbol="person" tint={theme.lilac} iconColor={theme.indigo} label={t('documentForm.person')}>
              <SelectBox
                value={people.find((p) => p.id === personId)?.name ?? t('common.wholeFamily')}
                onPress={choosePerson}
                accessibilityLabel={t('documentForm.person')}
              />
            </FieldRow>
            <Separator />
            <FieldRow symbol="tag" tint={theme.paleLilac} iconColor={theme.indigo} label={t('documentForm.type')}>
              <SelectBox
                value={docType ?? t('common.none')}
                placeholder={!docType}
                onPress={chooseType}
                accessibilityLabel={t('documentForm.type')}
              />
            </FieldRow>
          </WhiteCard>

          <SectionTitle>{t('documentForm.deadlineSection')}</SectionTitle>
          <WhiteCard style={styles.card}>
            {/* One element for VoiceOver: "Aggiungi scadenza, interruttore, attivo" */}
            <Pressable
              onPress={() => setHasExpiry(!hasExpiry)}
              accessibilityRole="switch"
              accessibilityLabel={t('documentForm.addDeadline')}
              accessibilityHint={dueText}
              accessibilityState={{ checked: hasExpiry }}
              style={styles.switchRow}>
              <IconBox symbol="calendar" tint={theme.lilac} color={theme.indigo} />
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{t('documentForm.addDeadline')}</Text>
                <Text style={styles.rowSubtitle}>{dueText}</Text>
              </View>
              <Switch value={hasExpiry} onValueChange={setHasExpiry} accessibilityLabel={t('documentForm.addDeadline')} />
            </Pressable>
            {hasExpiry && (
              <View style={styles.dueBox}>
                <DateCalendar value={expiryDate} onChange={setExpiryDate} />
                <View style={styles.remind}>
                  <IconBox symbol="bell" tint={theme.surface} color={theme.indigo} />
                  <FitLine
                    start={
                      <Text style={styles.remindLabel} accessibilityElementsHidden importantForAccessibility="no">
                        {t('documentForm.remindMe')}
                      </Text>
                    }
                    end={
                      <SelectBox
                        small
                        value={reminderLabel(reminderDays, defaultReminderDays)}
                        accessibilityLabel={t('documentForm.whenToRemind')}
                        onPress={() =>
                          chooseFrom(
                            t('documentForm.remindMe'),
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
                  <IconBox symbol="arrow.clockwise" tint={theme.surface} color={theme.indigo} />
                  <FitLine
                    start={
                      <Text style={styles.remindLabel} accessibilityElementsHidden importantForAccessibility="no">
                        {t('documentForm.repeats')}
                      </Text>
                    }
                    end={
                      <SelectBox
                        small
                        value={
                          repeatUnit === 'never'
                            ? t('documentForm.never')
                            : describeEvery({ every: repeatEvery, unit: repeatUnit })
                        }
                        accessibilityLabel={t('documentForm.repeats')}
                        onPress={() =>
                          chooseFrom<RepeatUnit | 'never'>(
                            t('documentForm.repeats'),
                            ['never', ...REPEAT_UNITS],
                            (unit) => (unit === 'never' ? t('documentForm.never') : capitalize(unitName(unit, 2))),
                            setRepeatUnit,
                          )
                        }
                      />
                    }
                  />
                </View>
                {repeatUnit !== 'never' && (
                  <View style={styles.remind}>
                    <IconBox symbol="number" tint={theme.surface} color={theme.indigo} />
                    <FitLine
                      start={
                        <Text style={styles.remindLabel} accessibilityElementsHidden importantForAccessibility="no">
                          {t('documentForm.every')}
                        </Text>
                      }
                      end={
                        <SelectBox
                          small
                          value={unitCount(repeatUnit, repeatEvery)}
                          accessibilityLabel={t('documentForm.every')}
                          onPress={() =>
                            chooseFrom(
                              t('documentForm.every'),
                              EVERY_OPTIONS.slice(0, 31),
                              (n) => unitCount(repeatUnit, n),
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

          <SectionTitle>{t('documentForm.notesSection')}</SectionTitle>
          <WhiteCard style={styles.notesCard}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={t('documentForm.notesPlaceholder')}
              placeholderTextColor={theme.placeholder}
              multiline
              accessibilityLabel={t('documentForm.notesSection')}
              style={styles.notes}
            />
          </WhiteCard>

          <WhiteCard style={[styles.card, styles.pinCard]}>
            <Pressable
              onPress={() => setPinned(!pinned)}
              accessibilityRole="switch"
              accessibilityLabel={t('documentForm.pin')}
              accessibilityHint={t('documentForm.pinSubtitle')}
              accessibilityState={{ checked: pinned }}
              style={styles.switchRow}>
              <IconBox symbol={pinned ? 'heart.fill' : 'heart'} tint={PIN_BACKGROUND(theme)} color={PIN_COLOR(theme)} />
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{t('documentForm.pin')}</Text>
                <Text style={styles.rowSubtitle}>{t('documentForm.pinSubtitle')}</Text>
              </View>
              <Switch value={pinned} onValueChange={setPinned} accessibilityLabel={t('documentForm.pin')} />
            </Pressable>
          </WhiteCard>

          {/* Ours: what it costs and whether it is paid */}
          <SectionTitle>{t('documentForm.amountSection')}</SectionTitle>
          <WhiteCard style={styles.card}>
            <FieldRow
              symbol="eurosign"
              tint={theme.successBackground}
              iconColor={theme.success}
              label={t('documentForm.amount')}>
              <View style={[styles.select, amountInvalid && styles.selectError]}>
                <Text style={styles.euro} accessibilityElementsHidden importantForAccessibility="no">
                  €
                </Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder={centsToInput(0)}
                  placeholderTextColor={theme.placeholder}
                  keyboardType="decimal-pad"
                  accessibilityLabel={t('documentForm.amountInEuro')}
                  accessibilityHint={amountInvalid ? t('documentForm.amountHint', { example: centsToInput(8420) }) : undefined}
                  style={styles.amountInput}
                />
                {/* Not only the red border: an exclamation mark too */}
                {amountInvalid && (
                  <SymbolView name="exclamationmark.circle.fill" tintColor={theme.error} size={18} accessibilityElementsHidden />
                )}
              </View>
            </FieldRow>
            <View style={styles.statusRow}>
              <Segmented
                values={STATUSES.map((s) => t(s.labelKey))}
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
              <SectionTitle>{t('documentForm.accessSection')}</SectionTitle>
              <WhiteCard style={styles.card}>
                <FieldRow
                  symbol="person.crop.circle"
                  tint={theme.lilac}
                  iconColor={theme.indigo}
                  label={t('documentForm.username')}>
                  <View style={styles.select}>
                    <TextInput
                      value={username}
                      onChangeText={setUsername}
                      placeholder={t('documentForm.usernamePlaceholder')}
                      placeholderTextColor={theme.placeholder}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="none"
                      accessibilityLabel={t('documentForm.username')}
                      style={styles.fieldInput}
                    />
                  </View>
                </FieldRow>
                <Separator />
                <FieldRow symbol="key" tint={theme.lilac} iconColor={theme.indigo} label={t('documentForm.password')}>
                  <View style={styles.select}>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder={hasSavedPassword ? t('documentForm.passwordUnchanged') : t('documentForm.password')}
                      placeholderTextColor={theme.placeholder}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="none" // no iOS "save password" prompt: it is not this app's login
                      accessibilityLabel={t('documentForm.password')}
                      style={styles.fieldInput}
                    />
                  </View>
                </FieldRow>
              </WhiteCard>
              <Text style={styles.note}>{t('documentForm.passwordNote')}</Text>
            </>
          )}

          {/* Ours: the number printed on the document */}
          <SectionTitle>{t('documentForm.numberSection')}</SectionTitle>
          <View style={styles.nameField}>
            <TextInput
              value={number ?? ''}
              onChangeText={setNumber}
              placeholder={t('documentForm.numberPlaceholder')}
              placeholderTextColor={theme.placeholder}
              autoCapitalize="characters"
              accessibilityLabel={t('documentForm.numberSection')}
              style={styles.nameInput}
            />
          </View>
        </>
      )}

      <View style={styles.save}>
        <PrimaryButton label={onDelete ? t('documentForm.saveChanges') : t('documentForm.saveDocument')} disabled={!canSave} onPress={submit} />
      </View>
      {(missing || amountInvalid) && (
        <Text style={styles.note}>
          {amountInvalid
            ? t('documentForm.amountHint', { example: centsToInput(8420) })
            : missingName && missingFolder
              ? t('documentForm.missingNameAndFolder')
              : missingName
                ? t('documentForm.missingName')
                : t('documentForm.missingFolder')}
        </Text>
      )}
      {onDelete && (
        <Pressable onPress={onDelete} accessibilityRole="button" style={styles.delete}>
          <Text style={styles.deleteText}>{t('documentForm.deleteDocument')}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function SectionTitle({ children }: { children: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Text style={styles.sectionTitle} accessibilityRole="header">
      {children}
    </Text>
  );
}

function Separator() {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.separator} />;
}

// Decoration: hidden from VoiceOver (the control next to it has the label)
function IconBox({ symbol, tint, color }: { symbol: SFSymbol; tint: string; color: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      style={[styles.iconBox, { backgroundColor: tint }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <SymbolView name={symbol} tintColor={color} size={19} />
    </View>
  );
}

// "Cartella   [Bollette ⌄]": icon square, a 72pt grey label, then the control (under the label
// with larger text). The control says the label itself: the grey label is hidden from VoiceOver.
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
  const styles = useThemedStyles(makeStyles);
  const large = useWindowDimensions().fontScale > 1.3;
  const labelText = (
    <Text style={[styles.fieldLabel, large && styles.fieldLabelLarge]} accessibilityElementsHidden importantForAccessibility="no">
      {label}
    </Text>
  );
  if (large) {
    return (
      <View style={[styles.fieldRow, styles.fieldRowStacked]}>
        <View style={styles.fieldRowTop}>
          <IconBox symbol={symbol} tint={tint} color={iconColor} />
          {labelText}
        </View>
        {children}
      </View>
    );
  }
  return (
    <View style={styles.fieldRow}>
      <IconBox symbol={symbol} tint={tint} color={iconColor} />
      {labelText}
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
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel}, ${value}`}
      hitSlop={small ? 4 : undefined} // 38 high: 46 to touch
      style={({ pressed }) => [small ? styles.selectSmall : styles.select, pressed && styles.pressed]}>
      <Text
        style={[small ? styles.selectSmallText : styles.selectText, placeholder && styles.placeholder]}>
        {value}
      </Text>
      <SymbolView name="chevron.down" tintColor={theme.textSecondary} size={13} weight="semibold" />
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
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
    color: c.text,
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
    color: c.textSecondary,
  },
  nameField: {
    marginTop: 10,
    minHeight: 56,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: c.surface,
    boxShadow: '0 6px 22px rgba(28, 30, 70, 0.08)',
    justifyContent: 'center',
  },
  nameInput: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: c.text,
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
    backgroundColor: c.separator,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  fieldRowStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },
  fieldRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  fieldLabelLarge: {
    width: 'auto',
    flexShrink: 1,
  },
  fieldLabel: {
    width: 72,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
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
    backgroundColor: c.paleLilac,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectError: {
    borderWidth: 1,
    borderColor: c.error,
  },
  selectText: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  selectSmall: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: c.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectSmallText: {
    flexShrink: 1,
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  placeholder: {
    color: c.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: c.text,
    paddingVertical: 10,
  },
  euro: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: c.textSecondary,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: c.text,
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
    color: c.text,
  },
  rowSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  dueBox: {
    marginTop: 4,
    marginHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: c.separator,
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
    backgroundColor: c.paleLilac,
  },
  remindLabel: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: c.text,
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
    color: c.text,
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
    color: c.textSecondary,
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
    color: c.error,
  },
});
