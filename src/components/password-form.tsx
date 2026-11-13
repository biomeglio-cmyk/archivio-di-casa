import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { scanDocument } from '@/capture/scan-document';
import { ColorPicker } from '@/components/color-picker';
import { PasswordPreviewTile } from '@/components/password-preview';
import { PrimaryButton } from '@/components/primary-button';
import { RoundIconButton } from '@/components/round-icon-button';
import { Switch } from '@/components/switch';
import { Text, TextInput } from '@/components/text';
import { WhiteCard } from '@/components/white-card';
import { GRADIENT_END, GRADIENT_START, PIN_TINT } from '@/constants/brand';
import {
  PASSWORD_COLORS,
  PASSWORD_GRADIENT,
  PASSWORD_ICONS,
  PASSWORD_INK,
  PASSWORD_NOTE,
  PASSWORD_TINT,
  passwordColorName,
  passwordIconName,
  passwordTypes,
  previewGradient,
  previewSymbol,
  typeMeta,
} from '@/constants/password-options';
import { cardSurface, type Palette, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import {
  insertDocument,
  listCustomPasswordTypes,
  savePasswordFields,
  setPinned,
  setPreviewImage,
  updateDocument,
  type DocumentInput,
} from '@/db/documents';
import { listPeople } from '@/db/people';
import type { DocumentDetail, PasswordPreview, PasswordType } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useI18n } from '@/i18n';
import { authenticate } from '@/security/app-lock';
import { readPassword, savePassword } from '@/security/password-vault';
import { chooseAction } from '@/utils/action-sheet';
import { generatePassword, passwordStrength, wheelHex } from '@/utils/password-tools';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const CLIPBOARD_SECONDS = 60;

type ImageChange = { kind: 'keep' } | { kind: 'new'; uri: string; source: 'scan' | 'gallery' } | { kind: 'remove' };

type Props = {
  existing: DocumentDetail | null; // null = "Nuova password"
  categoryId: number; // the Password category
  personId?: number | null; // "Aggiungi documento" from a person
  hasSavedPassword?: boolean; // editing an entry that has one in the Keychain
};

// "Nuova password" / "Modifica password" (docs/design/NuovaPassword.dc.html): the aqua note
// "Restano solo su questo telefono…", CHE COSA SALVI (Sito o app, Wi-Fi, PIN, Altro + the types
// written before; "Altro" asks "Che cos'è?"), NOME, ANTEPRIMA (7 colors + "Il tuo colore" with the
// wheel and the hex code, 12 icons, or an image: Scansiona / Dalla galleria), ACCESSO (user or
// network, the password with Mostra / Copia — after Face ID for a saved one — the strength bars and
// "Genera una password sicura"), SITO O APP (address) or the Wi-Fi "QR per gli ospiti", DI CHI È,
// NOTE, "Aggiungi ai preferiti", "Salva password". The fields follow the type exactly as the design.
// The password goes ONLY to the iOS Keychain.
export function PasswordForm({ existing, categoryId, personId: initialPerson = null, hasSavedPassword = false }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { data: people } = useDbQuery(listPeople, []);
  const { data: customTypes } = useDbQuery(listCustomPasswordTypes, []);
  const info = existing?.password ?? null;

  const [type, setType] = useState<PasswordType>(info?.type ?? 'site');
  const [customType, setCustomType] = useState(info?.customType ?? '');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [user, setUser] = useState(existing?.username ?? '');
  const [password, setPassword] = useState(''); // typed now; '' with a saved one = unchanged
  const [loadedSaved, setLoadedSaved] = useState(false); // the saved one was read after Face ID
  const [show, setShow] = useState(false);
  const [url, setUrl] = useState(info?.url ?? '');
  const [wifiQr, setWifiQr] = useState(info?.wifiQr ?? true);
  const [personId, setPersonId] = useState<number | null>(existing ? existing.personId : initialPerson);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [pinned, setPinnedState] = useState(existing?.isPinned ?? false);
  // Preview
  const [color, setColor] = useState<string>(info?.preview.color ?? 'aqua');
  const [hex, setHex] = useState(info?.preview.hex ?? wheelHex(220, 0.85));
  const [icon, setIcon] = useState<string | null>(info?.preview.icon ?? null);
  const [image, setImage] = useState<ImageChange>({ kind: 'keep' });
  const [saving, setSaving] = useState(false);
  const [wheelDragging, setWheelDragging] = useState(false); // a finger on the color wheel: no scroll

  const meta = typeMeta(type);
  const isPin = type === 'pin';
  const savedImage = image.kind === 'keep' && Boolean(info?.preview.imagePath);
  const hasImage = image.kind === 'new' || savedImage;
  const preview: PasswordPreview = {
    color,
    hex: color === 'custom' ? hex : null,
    icon,
    imagePath: image.kind === 'keep' ? (info?.preview.imagePath ?? null) : null,
  };
  const [gradientTop, gradientBottom] = previewGradient(preview);
  const chosenSymbol = previewSymbol(preview, type);
  const keepsSaved = Boolean(existing) && hasSavedPassword && password === '' && !loadedSaved;
  const strength = passwordStrength(password, type, theme);
  const canSave = title.trim().length > 0 && !saving;

  function pickType(next: PasswordType, written?: string) {
    setType(next);
    setCustomType(written ?? (next === 'other' ? customType : ''));
    setShow(false);
    setIcon(null); // the icon follows the type until one is chosen
  }

  // ——— Accesso ———

  async function savedPassword(reason: string): Promise<string | null> {
    if (!existing) return null;
    if (!(await authenticate(reason))) return null;
    return readPassword(existing.id);
  }

  async function toggleShow() {
    if (show) {
      setShow(false);
      return;
    }
    if (keepsSaved) {
      const value = await savedPassword(t('passwordForm.showPrompt'));
      if (value === null) return;
      setPassword(value);
      setLoadedSaved(true);
    }
    setShow(true);
  }

  async function copy() {
    let value = password;
    if (keepsSaved) value = (await savedPassword(t('passwordForm.copyPrompt'))) ?? '';
    if (!value) return;
    await Clipboard.setStringAsync(value, {
      ios: { localOnly: true, expiresAt: new Date(Date.now() + CLIPBOARD_SECONDS * 1000) },
    });
    Alert.alert(t('passwordForm.copiedTitle'), t('passwordForm.copiedMessage'));
  }

  function generate() {
    setPassword(generatePassword());
    setShow(true);
  }

  // ——— Anteprima ———

  async function scanImage() {
    const result = await scanDocument({ tip: false });
    if (result === 'cancelled') return;
    if (result === 'unavailable') {
      Alert.alert(t('passwordForm.scannerUnavailableTitle'), t('passwordForm.scannerUnavailableMessage'));
      return;
    }
    setImage({ kind: 'new', uri: result.pages[0], source: 'scan' });
  }

  async function galleryImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) setImage({ kind: 'new', uri: result.assets[0].uri, source: 'gallery' });
  }

  function chooseColor(key: string) {
    setColor(key);
    if (hasImage) setImage({ kind: 'remove' });
  }

  // A preset key, or "Il tuo colore" as '#RRGGBB'
  function pickColor(value: string) {
    if (PASSWORD_COLORS.some((c) => c.key === value)) {
      chooseColor(value);
      return;
    }
    setHex(value);
    chooseColor('custom');
  }

  // ——— Persona ———

  async function choosePerson() {
    if (!people) return;
    const index = await chooseAction(t('passwordForm.sections.whose'), [t('common.wholeFamily'), ...people.map((p) => p.name)]);
    if (index !== null) setPersonId(index === 0 ? null : people[index - 1].id);
  }

  // ——— Salva ———

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      const input: DocumentInput = {
        title,
        categoryId,
        personId,
        number: existing?.number ?? null,
        expiresAt: existing?.expiresAt ?? null,
        reminderDays: existing?.reminderDays ?? null,
        repeat: existing?.repeat ?? null,
        notes,
        username: isPin ? null : user,
        coverMode: existing?.coverMode ?? null,
        coverColor: existing?.coverColor ?? null,
      };
      const id = existing ? existing.id : await insertDocument(db, input);
      if (existing) await updateDocument(db, id, input);
      await savePasswordFields(db, id, {
        type,
        customType: type === 'other' ? customType : null,
        url: type === 'site' ? url : null,
        wifiQr: type === 'wifi' && wifiQr,
        preview: { color: preview.color, hex: preview.hex, icon },
      });
      if (image.kind === 'new') await setPreviewImage(db, id, image.uri);
      if (image.kind === 'remove') await setPreviewImage(db, id, null);
      // Only to the Keychain; an empty field on an entry that has one keeps it as it is
      if (password !== '') await savePassword(id, password);
      if (pinned !== (existing?.isPinned ?? false)) await setPinned(db, id, pinned);
      router.back();
    } catch (error) {
      setSaving(false);
      Alert.alert(t('passwordForm.saveFailed'), error instanceof Error ? error.message : String(error));
    }
  }

  const types: { key: string; type: PasswordType; name: string; symbol: SFSymbol; written?: string }[] = [
    ...passwordTypes().map((item) => ({ key: item.id, type: item.id, name: item.name, symbol: item.symbol })),
    ...(customTypes ?? []).map((written) => ({
      key: `custom-${written}`,
      type: 'other' as const,
      name: written,
      symbol: 'key' as SFSymbol,
      written,
    })),
  ];
  const typeSelected = (item: (typeof types)[number]) =>
    item.written
      ? type === 'other' && customType.trim().toLowerCase() === item.written.toLowerCase()
      : item.type === type && (item.type !== 'other' || !(customTypes ?? []).some((w) => w.toLowerCase() === customType.trim().toLowerCase()));
  const personName = people?.find((p) => p.id === personId)?.name ?? t('common.wholeFamily');
  const masked = keepsSaved ? '••••••••' : '';

  return (
    <ScrollView
      style={styles.screen}
      scrollEnabled={!wheelDragging}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[styles.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 36 }]}>
      <View style={styles.bar}>
        <RoundIconButton symbol="chevron.left" accessibilityLabel={t('common.back')} background={PASSWORD_TINT(theme)} color={theme.text} onPress={() => router.back()} />
        <Text style={styles.heading} accessibilityRole="header">
          {existing ? t('passwordForm.editTitle') : t('passwordForm.newTitle')}
        </Text>
        <View style={styles.barSpace} />
      </View>

      <View style={styles.privacy}>
        <LinearGradient colors={PASSWORD_GRADIENT} start={GRADIENT_START} end={GRADIENT_END} style={styles.privacyIcon}>
          <SymbolView name="faceid" tintColor="#FFFFFF" size={26} />
        </LinearGradient>
        <Text style={styles.privacyText}>{t('passwordForm.privacy')}</Text>
      </View>

      <Section>{t('passwordForm.sections.what')}</Section>
      <View style={styles.types} accessibilityRole="radiogroup" accessibilityLabel={t('passwordForm.typesLabel')}>
        {types.map((item) => {
          const on = typeSelected(item);
          return (
            <View key={item.key} style={styles.typeCell}>
              <Pressable
                onPress={() => pickType(item.type, item.written)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={[styles.typeButton, on && styles.typeOn]}>
                {on && <LinearGradient colors={PASSWORD_GRADIENT} start={GRADIENT_START} end={GRADIENT_END} style={[StyleSheet.absoluteFill, styles.typeFill]} />}
                <SymbolView name={item.symbol} tintColor={on ? '#FFFFFF' : theme.iconGrey} size={22} />
                <Text style={[styles.typeName, on && styles.typeNameOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {item.name}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      {type === 'other' && (
        <>
          <View style={[styles.field, styles.whatField]}>
            <SymbolView name="questionmark.circle" tintColor={PASSWORD_INK(theme)} size={20} />
            <TextInput
              value={customType}
              onChangeText={setCustomType}
              placeholder={t('passwordForm.customTypePlaceholder')}
              placeholderTextColor={theme.placeholder}
              accessibilityLabel={t('passwordForm.customTypeLabel')}
              style={styles.input}
            />
          </View>
          <Text style={styles.hint}>{t('passwordForm.customTypeHint')}</Text>
        </>
      )}

      <Section>{t('passwordForm.sections.name')}</Section>
      <View style={[styles.field, styles.whiteField]}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={meta.namePlaceholder}
          placeholderTextColor={theme.placeholder}
          accessibilityLabel={t('passwordForm.sections.name')}
          style={styles.input}
        />
      </View>

      <Section>{t('passwordForm.sections.preview')}</Section>
      <WhiteCard style={styles.previewCard}>
        <View style={styles.previewHead}>
          <PasswordPreviewTile
            info={{ type, preview }}
            size={64}
            imageUri={image.kind === 'new' ? image.uri : null}
          />
          <View style={styles.flex}>
            <Text style={styles.previewTitle}>{t('passwordForm.previewTitle')}</Text>
            <Text style={styles.previewText}>{t('passwordForm.previewText')}</Text>
          </View>
        </View>

        <Text style={styles.small}>{t('passwordForm.color')}</Text>
        <View style={styles.colors}>
          <ColorPicker
            presets={PASSWORD_COLORS.map((c) => ({ key: c.key, name: passwordColorName(c.key), colors: [c.top, c.bottom] as const }))}
            value={hasImage ? null : color === 'custom' ? hex : color}
            onChange={pickColor}
            columns={8}
            label={t('passwordForm.colorLabel')}
            onDraggingChange={setWheelDragging}
          />
        </View>

        <Text style={styles.small}>{t('passwordForm.icon')}</Text>
        <View style={styles.icons} accessibilityRole="radiogroup" accessibilityLabel={t('passwordForm.iconLabel')}>
          {PASSWORD_ICONS.map((i) => {
            const on = !hasImage && i.symbol === chosenSymbol;
            return (
              <View key={i.key} style={styles.iconCell}>
                <Pressable
                  onPress={() => {
                    setIcon(i.key);
                    if (hasImage) setImage({ kind: 'remove' });
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={passwordIconName(i.key)}
                  accessibilityState={{ checked: on }}
                  style={styles.iconButton}>
                  {on && (
                    <LinearGradient
                      colors={[gradientTop, gradientBottom]}
                      start={GRADIENT_START}
                      end={GRADIENT_END}
                      style={[StyleSheet.absoluteFill, styles.iconFill]}
                    />
                  )}
                  <SymbolView name={i.symbol} tintColor={on ? '#FFFFFF' : theme.iconGrey} size={20} />
                </Pressable>
              </View>
            );
          })}
        </View>

        <Text style={styles.small}>{t('passwordForm.image')}</Text>
        <View style={styles.imageButtons}>
          <ImageButton label={t('passwordForm.scan')} symbol="doc.viewfinder" on={image.kind === 'new' && image.source === 'scan'} onPress={scanImage} />
          <ImageButton label={t('passwordForm.gallery')} symbol="photo" on={image.kind === 'new' && image.source === 'gallery'} onPress={galleryImage} />
        </View>
        {hasImage && (
          <Pressable onPress={() => setImage({ kind: 'remove' })} accessibilityRole="button" style={styles.removeImage}>
            <Text style={styles.removeImageText}>{t('passwordForm.removeImage')}</Text>
          </Pressable>
        )}
      </WhiteCard>

      <Section>{t('passwordForm.sections.access')}</Section>
      <WhiteCard style={styles.card}>
        {meta.userLabel !== null && (
          <>
            <View style={styles.accessRow}>
              <IconBox symbol={meta.userSymbol} />
              <View style={styles.flex}>
                <Text style={styles.fieldLabel}>{meta.userLabel}</Text>
                <TextInput
                  value={user}
                  onChangeText={setUser}
                  placeholder={meta.userPlaceholder}
                  placeholderTextColor={theme.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="none"
                  accessibilityLabel={meta.userLabel}
                  style={styles.accessInput}
                />
              </View>
            </View>
            <View style={styles.separator} />
          </>
        )}
        <View style={[styles.accessRow, styles.passwordRow]}>
          <IconBox symbol={isPin ? 'circle.grid.3x3' : 'key'} />
          <View style={styles.flex}>
            <Text style={styles.fieldLabel}>{meta.passwordLabel}</Text>
            <TextInput
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setLoadedSaved(false);
              }}
              placeholder={masked || (isPin ? '••••' : t('passwordForm.passwordPlaceholder'))}
              placeholderTextColor={masked ? theme.text : theme.textSecondary}
              secureTextEntry={!show}
              keyboardType={isPin ? 'number-pad' : 'default'}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="none" // no iOS "save password" prompt: it is not this app's login
              accessibilityLabel={meta.passwordLabel}
              style={[styles.accessInput, styles.passwordInput]}
            />
          </View>
          <Pressable onPress={toggleShow} accessibilityRole="button" accessibilityLabel={show ? t('passwordForm.hide') : t('passwordForm.show')} style={styles.eye}>
            <SymbolView name={show ? 'eye.slash' : 'eye'} tintColor={theme.iconGrey} size={20} />
          </Pressable>
          <Pressable onPress={copy} accessibilityRole="button" accessibilityLabel={t('passwordForm.copy')} style={styles.eye}>
            <SymbolView name="doc.on.doc" tintColor={theme.iconGrey} size={19} />
          </Pressable>
        </View>
        <View style={styles.strength}>
          <View style={styles.bars} accessibilityElementsHidden>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.barPiece, { backgroundColor: !isPin && i < strength.level ? strength.color : theme.separator }]} />
            ))}
          </View>
          <Text style={[styles.strengthLabel, { color: strength.color }]}>
            {keepsSaved && !isPin ? t('passwordForm.saved') : strength.label}
          </Text>
        </View>
        {meta.canGenerate && (
          <View style={styles.generateRow}>
            <Pressable onPress={generate} accessibilityRole="button" style={({ pressed }) => [styles.generate, pressed && styles.pressed]}>
              <SymbolView name="wand.and.stars" tintColor={PASSWORD_INK(theme)} size={16} />
              <Text style={styles.generateText}>{t('passwordForm.generate')}</Text>
            </Pressable>
          </View>
        )}
      </WhiteCard>

      {type === 'site' && (
        <>
          <Section>{t('passwordForm.sections.site')}</Section>
          <View style={[styles.field, styles.whiteField]}>
            <SymbolView name="link" tintColor={theme.textSecondary} size={18} />
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder={t('passwordForm.urlPlaceholder')}
              placeholderTextColor={theme.placeholder}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={t('passwordForm.urlLabel')}
              style={styles.input}
            />
          </View>
        </>
      )}

      {type === 'wifi' && (
        <WhiteCard style={[styles.card, styles.wifiCard]}>
          <Pressable onPress={() => setWifiQr(!wifiQr)} accessible={false} style={styles.switchRow}>
            <IconBox symbol="qrcode" />
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>{t('passwordForm.wifiQrTitle')}</Text>
              <Text style={styles.rowSubtitle}>{t('passwordForm.wifiQrSubtitle')}</Text>
            </View>
            <Switch value={wifiQr} onValueChange={setWifiQr} accessibilityLabel={t('passwordForm.wifiQrTitle')} />
          </Pressable>
        </WhiteCard>
      )}

      <Section>{t('passwordForm.sections.whose')}</Section>
      <WhiteCard style={styles.card}>
        <View style={styles.personRow}>
          <View style={[styles.iconBox, { backgroundColor: theme.lilac }]}>
            <SymbolView name="person" tintColor={theme.indigo} size={19} />
          </View>
          <Text style={styles.personLabel}>{t('passwordForm.person')}</Text>
          <Pressable onPress={choosePerson} accessibilityRole="button" accessibilityLabel={t('passwordForm.personA11y', { name: personName })} style={styles.select}>
            <Text style={styles.selectText}>{personName}</Text>
            <SymbolView name="chevron.down" tintColor={theme.textSecondary} size={13} weight="semibold" />
          </Pressable>
        </View>
      </WhiteCard>

      <Section>{t('passwordForm.sections.notes')}</Section>
      <WhiteCard style={styles.notesCard}>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={meta.notePlaceholder}
          placeholderTextColor={theme.placeholder}
          multiline
          accessibilityLabel={t('passwordForm.sections.notes')}
          style={styles.notes}
        />
      </WhiteCard>

      <WhiteCard style={[styles.card, styles.favCard]}>
        <Pressable onPress={() => setPinnedState(!pinned)} accessible={false} style={styles.switchRow}>
          <View style={[styles.iconBox, { backgroundColor: PIN_TINT(theme) }]}>
            <SymbolView name={pinned ? 'heart.fill' : 'heart'} tintColor={theme.heart} size={19} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.rowTitle}>{t('passwordForm.favoriteTitle')}</Text>
            <Text style={styles.rowSubtitle}>{t('passwordForm.favoriteSubtitle')}</Text>
          </View>
          <Switch value={pinned} onValueChange={setPinnedState} accessibilityLabel={t('passwordForm.favoriteTitle')} />
        </Pressable>
      </WhiteCard>

      <PrimaryButton label={t('passwordForm.saveButton')} disabled={!canSave} onPress={save} style={styles.save} />
      {!title.trim() && <Text style={styles.note}>{t('passwordForm.saveHint')}</Text>}
    </ScrollView>
  );
}

function Section({ children }: { children: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Text style={styles.section} accessibilityRole="header">
      {children}
    </Text>
  );
}

function IconBox({ symbol }: { symbol: SFSymbol }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.iconBox}>
      <SymbolView name={symbol} tintColor={PASSWORD_INK(theme)} size={19} />
    </View>
  );
}

function ImageButton({ label, symbol, on, onPress }: { label: string; symbol: SFSymbol; on: boolean; onPress: () => void }): ReactNode {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [styles.imageButton, pressed && styles.pressed]}>
      {on && <LinearGradient colors={PASSWORD_GRADIENT} start={GRADIENT_START} end={GRADIENT_END} style={[StyleSheet.absoluteFill, styles.imageFill]} />}
      <SymbolView name={symbol} tintColor={on ? '#FFFFFF' : PASSWORD_INK(theme)} size={18} />
      <Text style={[styles.imageButtonText, on && { color: '#FFFFFF' }]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  page: {
    paddingHorizontal: Spacing.side,
  },
  flex: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 17,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  barSpace: {
    width: 44,
  },
  privacy: {
    marginTop: 18,
    padding: 16,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: PASSWORD_TINT(c),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  privacyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 12px rgba(47, 163, 184, 0.28)',
  },
  privacyText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONTS.regular,
    color: PASSWORD_NOTE(c),
  },
  section: {
    marginTop: 24,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: c.textSecondary,
  },
  types: {
    marginTop: 10,
    marginHorizontal: -4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  typeCell: {
    width: '25%',
    paddingHorizontal: 4,
  },
  typeButton: {
    height: 74,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: c.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  typeOn: {
    boxShadow: '0 6px 14px rgba(47, 163, 184, 0.30)',
  },
  typeFill: {
    borderRadius: 18,
  },
  typeName: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: c.textSecondary,
  },
  typeNameOn: {
    color: '#FFFFFF',
  },
  field: {
    height: 56,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  whatField: {
    marginTop: 12,
    backgroundColor: PASSWORD_TINT(c),
  },
  whiteField: {
    ...cardSurface(c),
    marginTop: 10,
    borderRadius: 18,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: c.text,
  },
  hint: {
    marginTop: 8,
    marginHorizontal: 4,
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  previewCard: {
    marginTop: 10,
    padding: 16,
  },
  previewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  previewTitle: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  previewText: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  small: {
    marginTop: 18,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    textTransform: 'uppercase',
    color: c.textSecondary,
  },
  colors: {
    marginTop: 10,
  },
  icons: {
    marginTop: 10,
    marginHorizontal: -4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  iconCell: {
    width: `${100 / 6}%`,
    paddingHorizontal: 4,
  },
  iconButton: {
    height: 44,
    borderRadius: 14,
    borderCurve: 'continuous',
    backgroundColor: c.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFill: {
    borderRadius: 14,
  },
  imageButtons: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  imageButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: PASSWORD_TINT(c),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imageFill: {
    borderRadius: 16,
  },
  imageButtonText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: PASSWORD_INK(c),
  },
  removeImage: {
    marginTop: 8,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: c.textSecondary,
  },
  card: {
    marginTop: 10,
    paddingVertical: 4,
  },
  accessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  passwordRow: {
    paddingRight: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PASSWORD_TINT(c),
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  accessInput: {
    paddingVertical: 2,
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: c.text,
  },
  passwordInput: {
    fontFamily: FONTS.semiBold,
  },
  eye: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    marginLeft: 70,
    marginRight: 16,
    backgroundColor: c.separator,
  },
  strength: {
    marginLeft: 70,
    marginRight: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  barPiece: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
  generateRow: {
    marginLeft: 70,
    marginRight: 16,
    marginBottom: 12,
    flexDirection: 'row',
  },
  generate: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: PASSWORD_TINT(c),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  generateText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: PASSWORD_INK(c),
  },
  pressed: {
    opacity: 0.7,
  },
  wifiCard: {
    marginTop: 12,
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
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  personLabel: {
    width: 72,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  select: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: c.paleLilac,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectText: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
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
  favCard: {
    marginTop: 12,
  },
  save: {
    marginTop: 24,
  },
  note: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
    textAlign: 'center',
  },
});
