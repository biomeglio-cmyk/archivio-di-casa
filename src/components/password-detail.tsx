import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { announce } from '@/a11y/accessibility';
import { confirmDeleteDocument } from '@/actions/delete-actions';
import { ActionSheet } from '@/components/action-sheet';
import { GeneratedCode } from '@/components/barcode-view';
import { PasswordPreviewTile } from '@/components/password-preview';
import { RoundIconButton } from '@/components/round-icon-button';
import { Switch } from '@/components/switch';
import { Text } from '@/components/text';
import { WhiteCard } from '@/components/white-card';
import { PASSWORD_INK, PASSWORD_TINT, typeMeta, typeName } from '@/constants/password-options';
import { type Palette, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { setPinned } from '@/db/documents';
import type { DocumentDetail, PasswordInfo } from '@/db/types';
import { useLargeText } from '@/hooks/use-large-text';
import { useMaxBrightness } from '@/hooks/use-max-brightness';
import { useI18n } from '@/i18n';
import { authenticate } from '@/security/app-lock';
import { readPassword } from '@/security/password-vault';
import { generateBarcode } from '@/utils/barcode';
import { passwordStrength, wifiQrPayload } from '@/utils/password-tools';
import { PIN_TINT } from '@/constants/brand';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const CLIPBOARD_SECONDS = 60;

// The detail of a Password entry, in the style of Nuova password: the preview, name and type,
// ACCESSO (user or network; the password masked, Mostra / Copia after Face ID or the passcode,
// the strength once shown), the address of a site, the Wi-Fi "QR per gli ospiti" (drawn only after
// Face ID, with the screen at full brightness), DI CHI È, NOTE, "Aggiungi ai preferiti",
// Modifica and Cancella. Everything shown is hidden again when the app goes to the background.
export function PasswordDetail({ document }: { document: DocumentDetail }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const largeText = useLargeText(); // the rows' icons on their own line, above the texts
  const row = [styles.row, largeText && styles.rowLarge];
  const indent = largeText && styles.indentLarge; // no icon column to start after
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
    if (value === null) Alert.alert(t('passwordDetail.noPasswordTitle'), t('passwordDetail.noPasswordMessage'));
    return value;
  }

  async function toggleShow() {
    if (shown !== null) {
      setShown(null);
      announce(t('passwordDetail.hidden'));
      return;
    }
    const value = await unlocked(t(`passwordDetail.showPrompt.${info.type}`));
    setShown(value);
    if (value !== null) {
      // VoiceOver reads the password just shown, and how strong it is
      const level = passwordStrength(value, info.type, theme);
      announce(level ? `${value}, ${level.label}` : value);
    }
  }

  async function copy() {
    const value = shown ?? (await unlocked(t(`passwordDetail.copyPrompt.${info.type}`)));
    if (value === null) return;
    await Clipboard.setStringAsync(value, {
      ios: { localOnly: true, expiresAt: new Date(Date.now() + CLIPBOARD_SECONDS * 1000) },
    });
    Alert.alert(t('passwordDetail.copiedTitle'), t('passwordDetail.copiedMessage'));
  }

  async function copyText(value: string) {
    await Clipboard.setStringAsync(value);
    Alert.alert(t('passwordDetail.copiedTextTitle'), value);
  }

  async function toggleQr() {
    if (qr !== null) {
      setQr(null);
      return;
    }
    const value = await unlocked(t('passwordDetail.qrPrompt'));
    setQr(value);
    if (value !== null) announce(t('passwordDetail.wifiQrLabel'));
  }

  function openSite() {
    if (!info.url) return;
    const address = /^[a-z]+:\/\//i.test(info.url) ? info.url : `https://${info.url}`;
    Linking.openURL(address).catch(() => Alert.alert(t('passwordDetail.invalidAddress'), info.url ?? ''));
  }

  const strength = shown !== null ? passwordStrength(shown, info.type, theme) : null;
  const generated = qr !== null && document.username ? generateBarcode(wifiQrPayload(document.username, qr), 'qr') : null;
  const subtitle = [typeName(info), document.person?.name ?? t('common.wholeFamily')].join(' · ');

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.bar}>
          <RoundIconButton symbol="chevron.left" accessibilityLabel={t('common.back')} background={PASSWORD_TINT(theme)} color={theme.text} onPress={() => router.back()} />
          <View style={styles.barRight}>
            <RoundIconButton
              symbol={document.isPinned ? 'heart.fill' : 'heart'}
              accessibilityLabel={document.isPinned ? t('passwordDetail.removeFavorite') : t('passwordDetail.favoriteTitle')}
              background={PASSWORD_TINT(theme)}
              color={theme.heart}
              onPress={() => setPinned(db, document.id, !document.isPinned)}
            />
            <RoundIconButton
              symbol="ellipsis"
              accessibilityLabel={t('passwordDetail.moreActions')}
              background={PASSWORD_TINT(theme)}
              color={theme.text}
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

        <Section>{t('passwordDetail.sections.access')}</Section>
        <WhiteCard style={styles.card}>
          {meta.userLabel !== null && (
            <>
              <View style={row}>
                <IconBox symbol={meta.userSymbol} />
                {/* Texts and buttons: the rest of the row, or the whole width under the icon */}
                <View style={[styles.rowMain, largeText && styles.fillLarge]}>
                  <View style={styles.flex} accessible accessibilityLabel={`${meta.userLabel}, ${document.username ?? t('common.none')}`}>
                    <Text style={styles.label}>{meta.userLabel}</Text>
                    <Text style={styles.value} selectable>
                      {document.username ?? '—'}
                    </Text>
                  </View>
                  {document.username ? (
                    <Pressable onPress={() => copyText(document.username!)} accessibilityRole="button" accessibilityLabel={t(`passwordDetail.copyUser.${info.type}`)} style={styles.round}>
                      <SymbolView name="doc.on.doc" tintColor={theme.iconGrey} size={19} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <View style={[styles.separator, indent]} />
            </>
          )}
          <View style={[row, styles.passwordRow]}>
            <IconBox symbol={info.type === 'pin' ? 'circle.grid.3x3' : 'key'} />
            <View style={[styles.rowMain, largeText && styles.fillLarge]}>
              <View
                style={styles.flex}
                accessible
                accessibilityLabel={`${meta.passwordLabel}, ${shown === null ? t('passwordDetail.hidden') : shown}`}>
                <Text style={styles.label}>{meta.passwordLabel}</Text>
                <Text style={[styles.value, styles.password, shown === null && styles.masked]} selectable={shown !== null}>
                  {shown ?? '••••••••'}
                </Text>
              </View>
              <Pressable onPress={toggleShow} accessibilityRole="button" accessibilityLabel={shown === null ? t('passwordDetail.show') : t('passwordDetail.hide')} style={styles.round}>
                <SymbolView name={shown === null ? 'eye' : 'eye.slash'} tintColor={theme.iconGrey} size={20} />
              </Pressable>
              <Pressable onPress={copy} accessibilityRole="button" accessibilityLabel={t('passwordDetail.copy')} style={styles.round}>
                <SymbolView name="doc.on.doc" tintColor={theme.iconGrey} size={19} />
              </Pressable>
            </View>
          </View>
          <View style={[styles.strength, indent]}>
            {strength ? (
              <>
                <View style={styles.bars} accessibilityElementsHidden>
                  {[0, 1, 2, 3].map((i) => (
                    <View key={i} style={[styles.barPiece, { backgroundColor: i < strength.level ? strength.color : theme.separator }]} />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              </>
            ) : (
              <Text style={styles.locked}>{t('passwordDetail.locked')}</Text>
            )}
          </View>
        </WhiteCard>

        {info.type === 'site' && info.url && (
          <>
            <Section>{t('passwordDetail.sections.site')}</Section>
            <WhiteCard style={styles.card}>
              <Pressable onPress={openSite} accessibilityRole="link" style={row}>
                <IconBox symbol="link" />
                <View style={[styles.rowMain, largeText && styles.fillLarge]}>
                  <Text style={[styles.flex, styles.link]} numberOfLines={4}>
                    {info.url}
                  </Text>
                  <SymbolView name="arrow.up.right.square" tintColor={theme.textSecondary} size={18} accessibilityElementsHidden />
                </View>
              </Pressable>
            </WhiteCard>
          </>
        )}

        {info.type === 'wifi' && info.wifiQr && (
          <>
            <Section>{t('passwordDetail.sections.wifiQr')}</Section>
            <WhiteCard style={styles.qrCard}>
              {generated ? (
                <>
                  <View style={styles.qrBox} accessibilityLabel={t('passwordDetail.wifiQrLabel')} accessible>
                    <GeneratedCode barcode={generated} maxWidth={220} maxHeight={220} />
                  </View>
                  <Text style={styles.qrNetwork}>{document.username}</Text>
                  <Text style={styles.qrHint}>{t('passwordDetail.qrHint')}</Text>
                </>
              ) : (
                <Text style={styles.qrHint}>
                  {document.username
                    ? t('passwordDetail.qrLocked')
                    : t('passwordDetail.qrNoNetwork')}
                </Text>
              )}
              {document.username ? (
                <Pressable
                  onPress={toggleQr}
                  accessibilityRole="button"
                  hitSlop={4}
                  style={({ pressed }) => [styles.qrButton, pressed && styles.pressed]}>
                  <SymbolView name={qr ? 'eye.slash' : 'qrcode'} tintColor={PASSWORD_INK(theme)} size={17} />
                  <Text style={styles.qrButtonText}>{qr ? t('passwordDetail.hideQr') : t('passwordDetail.showQr')}</Text>
                </Pressable>
              ) : null}
            </WhiteCard>
          </>
        )}

        <Section>{t('passwordDetail.sections.whose')}</Section>
        <WhiteCard style={styles.card}>
          <View
            style={row}
            accessible
            accessibilityLabel={`${t('passwordDetail.person')}, ${document.person?.name ?? t('common.wholeFamily')}`}>
            <View style={[styles.iconBox, { backgroundColor: theme.lilac }]}>
              <SymbolView name="person" tintColor={theme.indigo} size={19} />
            </View>
            {/* Large text: label and name under the icon, each on the whole width */}
            <Text style={[styles.personLabel, largeText && styles.fillLarge]}>{t('passwordDetail.person')}</Text>
            <Text style={[styles.flex, styles.value, largeText && styles.fillLarge]}>
              {document.person?.name ?? t('common.wholeFamily')}
            </Text>
          </View>
        </WhiteCard>

        {document.notes ? (
          <>
            <Section>{t('passwordDetail.sections.notes')}</Section>
            <WhiteCard style={styles.notesCard}>
              <Text style={styles.notes} selectable>
                {document.notes}
              </Text>
            </WhiteCard>
          </>
        ) : null}

        <WhiteCard style={[styles.card, styles.favCard]}>
          {/* One element for VoiceOver: "Aggiungi ai preferiti, interruttore, attivo" */}
          <Pressable
            onPress={() => setPinned(db, document.id, !document.isPinned)}
            accessibilityRole="switch"
            accessibilityLabel={t('passwordDetail.favoriteTitle')}
            accessibilityHint={t('passwordDetail.favoriteSubtitle')}
            accessibilityState={{ checked: document.isPinned }}
            style={row}>
            <View style={[styles.iconBox, { backgroundColor: PIN_TINT(theme) }]}>
              <SymbolView name={document.isPinned ? 'heart.fill' : 'heart'} tintColor={theme.heart} size={19} />
            </View>
            <View style={[styles.flex, largeText && styles.fillLarge]}>
              <Text style={styles.rowTitle}>{t('passwordDetail.favoriteTitle')}</Text>
              <Text style={styles.label}>{t('passwordDetail.favoriteSubtitle')}</Text>
            </View>
            <View style={largeText && styles.switchLarge}>
              <Switch
                value={document.isPinned}
                onValueChange={(on) => setPinned(db, document.id, on)}
                accessibilityLabel={t('passwordDetail.favoriteTitle')}
              />
            </View>
          </Pressable>
        </WhiteCard>

        <Pressable
          onPress={() => router.push({ pathname: '/edit-document/[id]', params: { id: String(document.id) } })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.edit, pressed && styles.pressed]}>
          <SymbolView name="pencil" tintColor={PASSWORD_INK(theme)} size={17} />
          <Text style={styles.editText}>{t('common.edit')}</Text>
        </Pressable>
      </ScrollView>

      <ActionSheet
        visible={menuOpen}
        title={document.title}
        subtitle={typeName(info)}
        actions={[
          {
            key: 'edit',
            label: t('common.edit'),
            symbol: 'pencil',
            onPress: () => router.push({ pathname: '/edit-document/[id]', params: { id: String(document.id) } }),
          },
          { key: 'delete', label: t('passwordDetail.moveToTrash'), symbol: 'trash', destructive: true, onPress: () => confirmDeleteDocument(document) },
        ]}
        onClose={() => setMenuOpen(false)}
      />
    </>
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
    <View style={styles.iconBox} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SymbolView name={symbol} tintColor={PASSWORD_INK(theme)} size={19} />
    </View>
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
    color: c.text,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: c.textSecondary,
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
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  // Large text: the leading icon on its own line, the texts on the whole width under it
  rowLarge: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  fillLarge: {
    flex: 0,
    alignSelf: 'stretch',
  },
  switchLarge: {
    alignSelf: 'flex-end', // under the texts, still on the right
  },
  indentLarge: {
    marginLeft: 16,
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
  label: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  value: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: c.text,
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
  locked: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  link: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: c.accent,
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
    color: c.text,
  },
  qrHint: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
    textAlign: 'center',
  },
  qrButton: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: PASSWORD_TINT(c),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qrButtonText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: PASSWORD_INK(c),
  },
  pressed: {
    opacity: 0.7,
  },
  personLabel: {
    minWidth: 72,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
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
    color: c.text,
  },
  favCard: {
    marginTop: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  edit: {
    marginTop: 24,
    minHeight: 52,
    paddingVertical: 12,
    borderRadius: 26,
    backgroundColor: PASSWORD_TINT(c),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: PASSWORD_INK(c),
  },
});
