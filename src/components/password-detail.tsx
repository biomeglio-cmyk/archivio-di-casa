import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { confirmDeleteDocument } from '@/actions/delete-actions';
import { ActionSheet } from '@/components/action-sheet';
import { GeneratedCode } from '@/components/barcode-view';
import { PasswordPreviewTile } from '@/components/password-preview';
import { RoundIconButton } from '@/components/round-icon-button';
import { Switch } from '@/components/switch';
import { Text } from '@/components/text';
import { WhiteCard } from '@/components/white-card';
import { PASSWORD_INK, PASSWORD_TINT, typeMeta, typeName } from '@/constants/password-options';
import { Colors, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { setPinned } from '@/db/documents';
import type { DocumentDetail, PasswordInfo } from '@/db/types';
import { useMaxBrightness } from '@/hooks/use-max-brightness';
import { authenticate } from '@/security/app-lock';
import { readPassword } from '@/security/password-vault';
import { generateBarcode } from '@/utils/barcode';
import { passwordStrength, wifiQrPayload } from '@/utils/password-tools';

const CLIPBOARD_SECONDS = 60;

// The detail of a Password entry, in the style of Nuova password: the preview, name and type,
// ACCESSO (user or network; the password masked, Mostra / Copia after Face ID or the passcode,
// the strength once shown), the address of a site, the Wi-Fi "QR per gli ospiti" (drawn only after
// Face ID, with the screen at full brightness), DI CHI È, NOTE, "Aggiungi ai preferiti",
// Modifica and Cancella. Everything shown is hidden again when the app goes to the background.
export function PasswordDetail({ document }: { document: DocumentDetail }) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const info: PasswordInfo = document.password ?? {
    type: 'other',
    customType: null,
    url: null,
    wifiQr: false,
    preview: { color: null, hex: null, icon: null, imagePath: null },
  };
  const meta = typeMeta(info.type);
  const [shown, setShown] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null); // the password, to draw the QR
  const [menuOpen, setMenuOpen] = useState(false);
  useMaxBrightness(qr !== null);

  // Nothing stays visible when the app leaves the screen
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        setShown(null);
        setQr(null);
      }
    });
    return () => subscription.remove();
  }, []);

  async function unlocked(reason: string): Promise<string | null> {
    if (!(await authenticate(reason))) return null;
    const value = await readPassword(document.id);
    if (value === null) Alert.alert('Nessuna password', 'Aggiungila con Modifica.');
    return value;
  }

  async function toggleShow() {
    if (shown !== null) {
      setShown(null);
      return;
    }
    setShown(await unlocked(`Mostra ${meta.passwordLabel.toLowerCase()}`));
  }

  async function copy() {
    const value = shown ?? (await unlocked(`Copia ${meta.passwordLabel.toLowerCase()}`));
    if (value === null) return;
    await Clipboard.setStringAsync(value, {
      ios: { localOnly: true, expiresAt: new Date(Date.now() + CLIPBOARD_SECONDS * 1000) },
    });
    Alert.alert('Copiata', 'Sparisce dagli appunti tra 1 minuto.');
  }

  async function copyText(value: string) {
    await Clipboard.setStringAsync(value);
    Alert.alert('Copiato', value);
  }

  async function toggleQr() {
    if (qr !== null) {
      setQr(null);
      return;
    }
    setQr(await unlocked('Mostra il QR per gli ospiti'));
  }

  function openSite() {
    if (!info.url) return;
    const address = /^[a-z]+:\/\//i.test(info.url) ? info.url : `https://${info.url}`;
    Linking.openURL(address).catch(() => Alert.alert('Indirizzo non valido', info.url ?? ''));
  }

  const strength = shown !== null ? passwordStrength(shown, info.type) : null;
  const generated = qr !== null && document.username ? generateBarcode(wifiQrPayload(document.username, qr), 'qr') : null;
  const subtitle = [typeName(info), document.person?.name ?? 'Tutta la famiglia'].join(' · ');

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.bar}>
          <RoundIconButton symbol="chevron.left" accessibilityLabel="Indietro" background={PASSWORD_TINT} color={Colors.current.text} onPress={() => router.back()} />
          <View style={styles.barRight}>
            <RoundIconButton
              symbol={document.isPinned ? 'heart.fill' : 'heart'}
              accessibilityLabel={document.isPinned ? 'Togli dai preferiti' : 'Aggiungi ai preferiti'}
              background={PASSWORD_TINT}
              color="#E8457A"
              onPress={() => setPinned(db, document.id, !document.isPinned)}
            />
            <RoundIconButton
              symbol="ellipsis"
              accessibilityLabel="Altre azioni"
              background={PASSWORD_TINT}
              color={Colors.current.text}
              onPress={() => setMenuOpen(true)}
            />
          </View>
        </View>

        <View style={styles.hero}>
          <PasswordPreviewTile info={info} size={88} />
          <Text style={styles.title} accessibilityRole="header">
            {document.title}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <Section>Accesso</Section>
        <WhiteCard style={styles.card}>
          {meta.userLabel !== null && (
            <>
              <View style={styles.row}>
                <IconBox symbol={meta.userSymbol} />
                <View style={styles.flex}>
                  <Text style={styles.label}>{meta.userLabel}</Text>
                  <Text style={styles.value} selectable>
                    {document.username ?? '—'}
                  </Text>
                </View>
                {document.username ? (
                  <Pressable onPress={() => copyText(document.username!)} accessibilityRole="button" accessibilityLabel={`Copia ${meta.userLabel}`} style={styles.round}>
                    <SymbolView name="doc.on.doc" tintColor="#4B5068" size={19} />
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.separator} />
            </>
          )}
          <View style={[styles.row, styles.passwordRow]}>
            <IconBox symbol={info.type === 'pin' ? 'circle.grid.3x3' : 'key'} />
            <View style={styles.flex}>
              <Text style={styles.label}>{meta.passwordLabel}</Text>
              <Text
                style={[styles.value, styles.password, shown === null && styles.masked]}
                accessibilityLabel={shown === null ? 'Nascosta' : shown}
                selectable={shown !== null}>
                {shown ?? '••••••••'}
              </Text>
            </View>
            <Pressable onPress={toggleShow} accessibilityRole="button" accessibilityLabel={shown === null ? 'Mostra' : 'Nascondi'} style={styles.round}>
              <SymbolView name={shown === null ? 'eye' : 'eye.slash'} tintColor="#4B5068" size={20} />
            </Pressable>
            <Pressable onPress={copy} accessibilityRole="button" accessibilityLabel="Copia" style={styles.round}>
              <SymbolView name="doc.on.doc" tintColor="#4B5068" size={19} />
            </Pressable>
          </View>
          <View style={styles.strength}>
            {strength ? (
              <>
                <View style={styles.bars} accessibilityElementsHidden>
                  {[0, 1, 2, 3].map((i) => (
                    <View key={i} style={[styles.barPiece, { backgroundColor: i < strength.level ? strength.color : '#E6E8F0' }]} />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              </>
            ) : (
              <Text style={styles.locked}>Si vede dopo Face ID o il codice dell’iPhone</Text>
            )}
          </View>
        </WhiteCard>

        {info.type === 'site' && info.url && (
          <>
            <Section>Sito o app</Section>
            <WhiteCard style={styles.card}>
              <Pressable onPress={openSite} accessibilityRole="link" style={styles.row}>
                <IconBox symbol="link" />
                <Text style={[styles.flex, styles.link]} numberOfLines={2}>
                  {info.url}
                </Text>
                <SymbolView name="arrow.up.right.square" tintColor={Colors.current.textSecondary} size={18} />
              </Pressable>
            </WhiteCard>
          </>
        )}

        {info.type === 'wifi' && info.wifiQr && (
          <>
            <Section>QR per gli ospiti</Section>
            <WhiteCard style={styles.qrCard}>
              {generated ? (
                <>
                  <View style={styles.qrBox} accessibilityLabel="QR della rete Wi-Fi" accessible>
                    <GeneratedCode barcode={generated} maxWidth={220} maxHeight={220} />
                  </View>
                  <Text style={styles.qrNetwork}>{document.username}</Text>
                  <Text style={styles.qrHint}>Lo inquadrano con la fotocamera e si collegano.</Text>
                </>
              ) : (
                <Text style={styles.qrHint}>
                  {document.username
                    ? 'Il QR contiene la password: si vede dopo Face ID o il codice dell’iPhone.'
                    : 'Aggiungi il nome della rete con Modifica per avere il QR.'}
                </Text>
              )}
              {document.username ? (
                <Pressable onPress={toggleQr} accessibilityRole="button" style={({ pressed }) => [styles.qrButton, pressed && styles.pressed]}>
                  <SymbolView name={qr ? 'eye.slash' : 'qrcode'} tintColor={PASSWORD_INK} size={17} />
                  <Text style={styles.qrButtonText}>{qr ? 'Nascondi il QR' : 'Mostra il QR'}</Text>
                </Pressable>
              ) : null}
            </WhiteCard>
          </>
        )}

        <Section>Di chi è</Section>
        <WhiteCard style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: Colors.current.lilac }]}>
              <SymbolView name="person" tintColor={Colors.current.indigo} size={19} />
            </View>
            <Text style={styles.personLabel}>Persona</Text>
            <Text style={[styles.flex, styles.value]}>{document.person?.name ?? 'Tutta la famiglia'}</Text>
          </View>
        </WhiteCard>

        {document.notes ? (
          <>
            <Section>Note</Section>
            <WhiteCard style={styles.notesCard}>
              <Text style={styles.notes} selectable>
                {document.notes}
              </Text>
            </WhiteCard>
          </>
        ) : null}

        <WhiteCard style={[styles.card, styles.favCard]}>
          <Pressable onPress={() => setPinned(db, document.id, !document.isPinned)} accessible={false} style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: '#FDEBF1' }]}>
              <SymbolView name={document.isPinned ? 'heart.fill' : 'heart'} tintColor="#E8457A" size={19} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.rowTitle}>Aggiungi ai preferiti</Text>
              <Text style={styles.label}>La trovi subito in home</Text>
            </View>
            <Switch
              value={document.isPinned}
              onValueChange={(on) => setPinned(db, document.id, on)}
              accessibilityLabel="Aggiungi ai preferiti"
            />
          </Pressable>
        </WhiteCard>

        <Pressable
          onPress={() => router.push({ pathname: '/edit-document/[id]', params: { id: String(document.id) } })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.edit, pressed && styles.pressed]}>
          <SymbolView name="pencil" tintColor={PASSWORD_INK} size={17} />
          <Text style={styles.editText}>Modifica</Text>
        </Pressable>
      </ScrollView>

      <ActionSheet
        visible={menuOpen}
        title={document.title}
        subtitle={typeName(info)}
        actions={[
          {
            key: 'edit',
            label: 'Modifica',
            symbol: 'pencil',
            onPress: () => router.push({ pathname: '/edit-document/[id]', params: { id: String(document.id) } }),
          },
          { key: 'delete', label: 'Sposta nel cestino', symbol: 'trash', destructive: true, onPress: () => confirmDeleteDocument(document) },
        ]}
        onClose={() => setMenuOpen(false)}
      />
    </>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.current.background,
  },
  page: {
    paddingHorizontal: Spacing.side,
  },
  flex: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barRight: {
    flexDirection: 'row',
    gap: 10,
  },
  hero: {
    marginTop: 12,
    alignItems: 'center',
  },
  title: {
    marginTop: 14,
    fontSize: 26,
    fontFamily: FONTS.bold,
    color: Colors.current.text,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: Colors.current.textSecondary,
  },
  card: {
    marginTop: 10,
    paddingVertical: 4,
  },
  row: {
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
  label: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
  },
  value: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: Colors.current.text,
  },
  password: {
    fontFamily: FONTS.semiBold,
  },
  masked: {
    letterSpacing: 2,
  },
  round: {
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
    backgroundColor: Colors.current.separator,
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
  locked: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
  },
  link: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: Colors.current.accent,
  },
  qrCard: {
    marginTop: 10,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  qrBox: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  qrNetwork: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: Colors.current.text,
  },
  qrHint: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
    textAlign: 'center',
  },
  qrButton: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: PASSWORD_TINT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qrButtonText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: PASSWORD_INK,
  },
  pressed: {
    opacity: 0.7,
  },
  personLabel: {
    width: 72,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
  },
  notesCard: {
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  notes: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FONTS.regular,
    color: Colors.current.text,
  },
  favCard: {
    marginTop: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: Colors.current.text,
  },
  edit: {
    marginTop: 24,
    height: 52,
    borderRadius: 26,
    backgroundColor: PASSWORD_TINT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: PASSWORD_INK,
  },
});
