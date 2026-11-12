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
import { ColorWheel } from '@/components/color-wheel';
import { PasswordPreviewTile } from '@/components/password-preview';
import { PrimaryButton } from '@/components/primary-button';
import { RoundIconButton } from '@/components/round-icon-button';
import { Switch } from '@/components/switch';
import { Text, TextInput } from '@/components/text';
import { WhiteCard } from '@/components/white-card';
import { GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import {
  PASSWORD_COLORS,
  PASSWORD_GRADIENT,
  PASSWORD_ICONS,
  PASSWORD_INK,
  PASSWORD_NOTE,
  PASSWORD_TINT,
  PASSWORD_TYPES,
  previewGradient,
  previewSymbol,
  typeMeta,
} from '@/constants/password-options';
import { CardSurface, Colors, Spacing } from '@/constants/theme';
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
import { authenticate } from '@/security/app-lock';
import { readPassword, savePassword } from '@/security/password-vault';
import { chooseAction } from '@/utils/action-sheet';
import { generatePassword, passwordStrength, wheelHex } from '@/utils/password-tools';

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
  const [hexText, setHexText] = useState(info?.preview.hex ?? wheelHex(220, 0.85));
  const [wheel, setWheel] = useState({ hue: 220, radius: 0.85 });
  const [icon, setIcon] = useState<string | null>(info?.preview.icon ?? null);
  const [image, setImage] = useState<ImageChange>({ kind: 'keep' });
  const [saving, setSaving] = useState(false);

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
  const strength = passwordStrength(password, type);
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
      const value = await savedPassword('Mostra la password');
      if (value === null) return;
      setPassword(value);
      setLoadedSaved(true);
    }
    setShow(true);
  }

  async function copy() {
    let value = password;
    if (keepsSaved) value = (await savedPassword('Copia la password')) ?? '';
    if (!value) return;
    await Clipboard.setStringAsync(value, {
      ios: { localOnly: true, expiresAt: new Date(Date.now() + CLIPBOARD_SECONDS * 1000) },
    });
    Alert.alert('Copiata', 'Sparisce dagli appunti tra 1 minuto.');
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
      Alert.alert('Scanner non disponibile', 'Scegli l’immagine dalla galleria.');
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

  function pickWheel(hue: number, radius: number) {
    const value = wheelHex(hue, radius);
    setWheel({ hue, radius });
    setHex(value);
    setHexText(value);
    chooseColor('custom');
  }

  function typeHex(text: string) {
    const value = text.startsWith('#') ? text.toUpperCase() : `#${text.toUpperCase()}`;
    setHexText(value);
    if (/^#[0-9A-F]{6}$/.test(value)) {
      setHex(value);
      chooseColor('custom');
    }
  }

  // ——— Persona ———

  async function choosePerson() {
    if (!people) return;
    const index = await chooseAction('Di chi è', ['Tutta la famiglia', ...people.map((p) => p.name)]);
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
      Alert.alert('Impossibile salvare', error instanceof Error ? error.message : String(error));
    }
  }

  const types: { key: string; type: PasswordType; name: string; symbol: SFSymbol; written?: string }[] = [
    ...PASSWORD_TYPES.map((t) => ({ key: t.id, type: t.id, name: t.name, symbol: t.symbol })),
    ...(customTypes ?? []).map((written) => ({
      key: `custom-${written}`,
      type: 'other' as const,
      name: written,
      symbol: 'key' as SFSymbol,
      written,
    })),
  ];
  const typeSelected = (t: (typeof types)[number]) =>
    t.written
      ? type === 'other' && customType.trim().toLowerCase() === t.written.toLowerCase()
      : t.type === type && (t.type !== 'other' || !(customTypes ?? []).some((w) => w.toLowerCase() === customType.trim().toLowerCase()));
  const personName = people?.find((p) => p.id === personId)?.name ?? 'Tutta la famiglia';
  const masked = keepsSaved ? '••••••••' : '';

  return (
    <ScrollView
      style={styles.screen}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[styles.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 36 }]}>
      <View style={styles.bar}>
        <RoundIconButton symbol="chevron.left" accessibilityLabel="Indietro" background={PASSWORD_TINT} color={Colors.light.text} onPress={() => router.back()} />
        <Text style={styles.heading} accessibilityRole="header">
          {existing ? 'Modifica password' : 'Nuova password'}
        </Text>
        <View style={styles.barSpace} />
      </View>

      <View style={styles.privacy}>
        <LinearGradient colors={PASSWORD_GRADIENT} start={GRADIENT_START} end={GRADIENT_END} style={styles.privacyIcon}>
          <SymbolView name="faceid" tintColor="#FFFFFF" size={26} />
        </LinearGradient>
        <Text style={styles.privacyText}>Restano solo su questo telefono e si aprono con Face ID.</Text>
      </View>

      <Section>Che cosa salvi</Section>
      <View style={styles.types} accessibilityRole="radiogroup" accessibilityLabel="Tipo di password">
        {types.map((t) => {
          const on = typeSelected(t);
          return (
            <View key={t.key} style={styles.typeCell}>
              <Pressable
                onPress={() => pickType(t.type, t.written)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={[styles.typeButton, on && styles.typeOn]}>
                {on && <LinearGradient colors={PASSWORD_GRADIENT} start={GRADIENT_START} end={GRADIENT_END} style={[StyleSheet.absoluteFill, styles.typeFill]} />}
                <SymbolView name={t.symbol} tintColor={on ? '#FFFFFF' : '#4B5068'} size={22} />
                <Text style={[styles.typeName, on && styles.typeNameOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  {t.name}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      {type === 'other' && (
        <>
          <View style={[styles.field, styles.whatField]}>
            <SymbolView name="questionmark.circle" tintColor={PASSWORD_INK} size={20} />
            <TextInput
              value={customType}
              onChangeText={setCustomType}
              placeholder="Che cos'è? Allarme, cassaforte, lucchetto…"
              placeholderTextColor={Colors.light.textSecondary}
              accessibilityLabel="Che cos'è"
              style={styles.input}
            />
          </View>
          <Text style={styles.hint}>Diventa un nuovo tipo e la prossima volta lo trovi tra le scelte.</Text>
        </>
      )}

      <Section>Nome</Section>
      <View style={[styles.field, styles.whiteField]}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={meta.namePlaceholder}
          placeholderTextColor={Colors.light.textSecondary}
          accessibilityLabel="Nome"
          style={styles.input}
        />
      </View>

      <Section>Anteprima</Section>
      <WhiteCard style={styles.previewCard}>
        <View style={styles.previewHead}>
          <PasswordPreviewTile
            info={{ type, preview }}
            size={64}
            imageUri={image.kind === 'new' ? image.uri : null}
          />
          <View style={styles.flex}>
            <Text style={styles.previewTitle}>Come la vedi nell’elenco</Text>
            <Text style={styles.previewText}>Colore e icona, oppure un’immagine.</Text>
          </View>
        </View>

        <Text style={styles.small}>Colore</Text>
        <View style={styles.colors} accessibilityRole="radiogroup" accessibilityLabel="Colore dell'anteprima">
          {PASSWORD_COLORS.map((c) => {
            const on = !hasImage && color === c.key;
            return (
              <View key={c.key} style={styles.colorCell}>
                <Pressable
                  onPress={() => chooseColor(c.key)}
                  accessibilityRole="radio"
                  accessibilityLabel={c.name}
                  accessibilityState={{ checked: on }}
                  style={[styles.swatch, on && { boxShadow: `0 0 0 3px #FFFFFF, 0 0 0 5px ${c.bottom}` }]}>
                  <LinearGradient colors={[c.top, c.bottom]} start={GRADIENT_START} end={GRADIENT_END} style={styles.swatchFill} />
                </Pressable>
              </View>
            );
          })}
          <View style={styles.colorCell}>
            <Pressable
              onPress={() => chooseColor('custom')}
              accessibilityRole="radio"
              accessibilityLabel="Il tuo colore"
              accessibilityState={{ checked: !hasImage && color === 'custom' }}
              style={[styles.swatch, !hasImage && color === 'custom' && { boxShadow: `0 0 0 3px #FFFFFF, 0 0 0 5px ${hex}` }]}>
              <LinearGradient
                colors={['#FF5A5A', '#FFC24A', '#5CD68A', '#4AB8FF', '#7A5CFF', '#FF5AC8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.swatchFill, styles.center]}>
                <View style={styles.plusDot}>
                  <SymbolView name="plus" tintColor="#4B5068" size={10} weight="bold" />
                </View>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
        {!hasImage && color === 'custom' && (
          <View style={styles.wheelPanel}>
            <View style={styles.center}>
              <ColorWheel hue={wheel.hue} radius={wheel.radius} onChange={pickWheel} />
            </View>
            <View style={styles.hexRow}>
              <View style={[styles.hexSwatch, { backgroundColor: hex }]} />
              <View style={styles.hexField}>
                <Text style={styles.hexLabel}>Codice</Text>
                <TextInput
                  value={hexText}
                  onChangeText={typeHex}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={7}
                  accessibilityLabel="Codice colore"
                  style={styles.hexInput}
                />
              </View>
            </View>
          </View>
        )}

        <Text style={styles.small}>Icona</Text>
        <View style={styles.icons} accessibilityRole="radiogroup" accessibilityLabel="Icona dell'anteprima">
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
                  accessibilityLabel={i.name}
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
                  <SymbolView name={i.symbol} tintColor={on ? '#FFFFFF' : '#4B5068'} size={20} />
                </Pressable>
              </View>
            );
          })}
        </View>

        <Text style={styles.small}>Immagine</Text>
        <View style={styles.imageButtons}>
          <ImageButton label="Scansiona" symbol="doc.viewfinder" on={image.kind === 'new' && image.source === 'scan'} onPress={scanImage} />
          <ImageButton label="Dalla galleria" symbol="photo" on={image.kind === 'new' && image.source === 'gallery'} onPress={galleryImage} />
        </View>
        {hasImage && (
          <Pressable onPress={() => setImage({ kind: 'remove' })} accessibilityRole="button" style={styles.removeImage}>
            <Text style={styles.removeImageText}>Togli l’immagine e usa colore e icona</Text>
          </Pressable>
        )}
      </WhiteCard>

      <Section>Accesso</Section>
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
                  placeholderTextColor={Colors.light.textSecondary}
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
              placeholder={masked || (isPin ? '••••' : 'Scrivi o genera')}
              placeholderTextColor={masked ? Colors.light.text : Colors.light.textSecondary}
              secureTextEntry={!show}
              keyboardType={isPin ? 'number-pad' : 'default'}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="none" // no iOS "save password" prompt: it is not this app's login
              accessibilityLabel={meta.passwordLabel}
              style={[styles.accessInput, styles.passwordInput]}
            />
          </View>
          <Pressable onPress={toggleShow} accessibilityRole="button" accessibilityLabel={show ? 'Nascondi' : 'Mostra'} style={styles.eye}>
            <SymbolView name={show ? 'eye.slash' : 'eye'} tintColor="#4B5068" size={20} />
          </Pressable>
          <Pressable onPress={copy} accessibilityRole="button" accessibilityLabel="Copia" style={styles.eye}>
            <SymbolView name="doc.on.doc" tintColor="#4B5068" size={19} />
          </Pressable>
        </View>
        <View style={styles.strength}>
          <View style={styles.bars} accessibilityElementsHidden>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.barPiece, { backgroundColor: !isPin && i < strength.level ? strength.color : '#E6E8F0' }]} />
            ))}
          </View>
          <Text style={[styles.strengthLabel, { color: strength.color }]}>
            {keepsSaved && !isPin ? 'Salvata' : strength.label}
          </Text>
        </View>
        {meta.canGenerate && (
          <View style={styles.generateRow}>
            <Pressable onPress={generate} accessibilityRole="button" style={({ pressed }) => [styles.generate, pressed && styles.pressed]}>
              <SymbolView name="wand.and.stars" tintColor={PASSWORD_INK} size={16} />
              <Text style={styles.generateText}>Genera una password sicura</Text>
            </Pressable>
          </View>
        )}
      </WhiteCard>

      {type === 'site' && (
        <>
          <Section>Sito o app</Section>
          <View style={[styles.field, styles.whiteField]}>
            <SymbolView name="link" tintColor={Colors.light.textSecondary} size={18} />
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="www.esempio.it"
              placeholderTextColor={Colors.light.textSecondary}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Indirizzo del sito"
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
              <Text style={styles.rowTitle}>QR per gli ospiti</Text>
              <Text style={styles.rowSubtitle}>Lo inquadrano e si collegano</Text>
            </View>
            <Switch value={wifiQr} onValueChange={setWifiQr} accessibilityLabel="QR per gli ospiti" />
          </Pressable>
        </WhiteCard>
      )}

      <Section>Di chi è</Section>
      <WhiteCard style={styles.card}>
        <View style={styles.personRow}>
          <View style={[styles.iconBox, { backgroundColor: Colors.light.lilac }]}>
            <SymbolView name="person" tintColor={Colors.light.indigo} size={19} />
          </View>
          <Text style={styles.personLabel}>Persona</Text>
          <Pressable onPress={choosePerson} accessibilityRole="button" accessibilityLabel={`Persona, ${personName}`} style={styles.select}>
            <Text style={styles.selectText}>{personName}</Text>
            <SymbolView name="chevron.down" tintColor={Colors.light.textSecondary} size={13} weight="semibold" />
          </Pressable>
        </View>
      </WhiteCard>

      <Section>Note</Section>
      <WhiteCard style={styles.notesCard}>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={meta.notePlaceholder}
          placeholderTextColor={Colors.light.textSecondary}
          multiline
          accessibilityLabel="Note"
          style={styles.notes}
        />
      </WhiteCard>

      <WhiteCard style={[styles.card, styles.favCard]}>
        <Pressable onPress={() => setPinnedState(!pinned)} accessible={false} style={styles.switchRow}>
          <View style={[styles.iconBox, { backgroundColor: '#FDEBF1' }]}>
            <SymbolView name={pinned ? 'heart.fill' : 'heart'} tintColor="#E8457A" size={19} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.rowTitle}>Aggiungi ai preferiti</Text>
            <Text style={styles.rowSubtitle}>La trovi subito in home</Text>
          </View>
          <Switch value={pinned} onValueChange={setPinnedState} accessibilityLabel="Aggiungi ai preferiti" />
        </Pressable>
      </WhiteCard>

      <PrimaryButton label="Salva password" disabled={!canSave} onPress={save} style={styles.save} />
      {!title.trim() && <Text style={styles.note}>Per salvare scrivi il nome.</Text>}
    </ScrollView>
  );
}

function Section({ children }: { children: string }) {
  return (
    <Text style={styles.section} accessibilityRole="header">
      {children}
    </Text>
  );
}

function IconBox({ symbol }: { symbol: SFSymbol }) {
  return (
    <View style={styles.iconBox}>
      <SymbolView name={symbol} tintColor={PASSWORD_INK} size={19} />
    </View>
  );
}

function ImageButton({ label, symbol, on, onPress }: { label: string; symbol: SFSymbol; on: boolean; onPress: () => void }): ReactNode {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [styles.imageButton, pressed && styles.pressed]}>
      {on && <LinearGradient colors={PASSWORD_GRADIENT} start={GRADIENT_START} end={GRADIENT_END} style={[StyleSheet.absoluteFill, styles.imageFill]} />}
      <SymbolView name={symbol} tintColor={on ? '#FFFFFF' : PASSWORD_INK} size={18} />
      <Text style={[styles.imageButtonText, on && { color: '#FFFFFF' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
    color: Colors.light.text,
  },
  barSpace: {
    width: 44,
  },
  privacy: {
    marginTop: 18,
    padding: 16,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: PASSWORD_TINT,
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
    color: PASSWORD_NOTE,
  },
  section: {
    marginTop: 24,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: Colors.light.textSecondary,
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
    backgroundColor: '#F4F5F8',
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
    color: '#4B5068',
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
    backgroundColor: PASSWORD_TINT,
  },
  whiteField: {
    ...CardSurface,
    marginTop: 10,
    borderRadius: 18,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: Colors.light.text,
  },
  hint: {
    marginTop: 8,
    marginHorizontal: 4,
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
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
    color: Colors.light.text,
  },
  previewText: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
  },
  small: {
    marginTop: 18,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    textTransform: 'uppercase',
    color: '#8A8DA0',
  },
  colors: {
    marginTop: 10,
    flexDirection: 'row',
  },
  colorCell: {
    flex: 1,
    alignItems: 'center',
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  swatchFill: {
    flex: 1,
    borderRadius: 16,
  },
  plusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelPanel: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: Colors.light.paleLilac,
  },
  hexRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hexSwatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  hexField: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  hexLabel: {
    marginRight: 8,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
  },
  hexInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: Colors.light.text,
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
    backgroundColor: '#F4F5F8',
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
    backgroundColor: PASSWORD_TINT,
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
    color: PASSWORD_INK,
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
    color: '#4B5068',
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
    backgroundColor: PASSWORD_TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
  },
  accessInput: {
    paddingVertical: 2,
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: Colors.light.text,
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
    backgroundColor: Colors.light.separator,
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
    backgroundColor: PASSWORD_TINT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  generateText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: PASSWORD_INK,
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
    color: Colors.light.text,
  },
  rowSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
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
    color: Colors.light.textSecondary,
  },
  select: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.light.paleLilac,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectText: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: Colors.light.text,
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
    color: Colors.light.text,
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
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});
