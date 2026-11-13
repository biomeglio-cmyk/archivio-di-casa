import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as MailComposer from 'expo-mail-composer';
import { Alert, Linking, Platform } from 'react-native';

import { showToast } from '@/components/toast';
import { currentLanguage, t } from '@/i18n';
import { languageInfo } from '@/settings/language';

// The support address of Sottomano (never translated)
export const SUPPORT_EMAIL = 'info@wknstudio.com';

// What helps to answer, and nothing personal: app version, iOS version, iPhone model, app language.
// No name, no documents, no data from the archive.
function supportFooter(): string {
  const version = Constants.expoConfig?.version ?? '';
  const ios = `${Platform.OS === 'ios' ? 'iOS' : Platform.OS} ${String(Platform.Version)}`;
  const model = Device.modelName ?? Device.deviceName ?? '';
  const language = languageInfo(currentLanguage()).english;
  return `\n\n\n—\n${t('contact.footerTitle')}\nSottomano ${version} · ${ios} · ${model} · ${language}`; // i18n-ignore
}

// "Scrivici": a new email to the support address (Mail), else the mail app of the phone (mailto:),
// else the address with "Copia indirizzo" when no mail account is set up
export async function writeToSupport(): Promise<void> {
  const subject = t('contact.subject');
  const body = supportFooter();
  try {
    if (await MailComposer.isAvailableAsync()) {
      await MailComposer.composeAsync({ recipients: [SUPPORT_EMAIL], subject, body });
      return;
    }
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // falls through to the address
  }
  showSupportAddress();
}

// No mail account: the address, and a button that copies it
export function showSupportAddress(): void {
  Alert.alert(t('contact.noMailTitle'), t('contact.noMailMessage', { email: SUPPORT_EMAIL }), [
    { text: t('common.close'), style: 'cancel' },
    {
      text: t('contact.copyAddress'),
      // A plain copy (no 60 s expiry: that is only for passwords), then a short "Copiato" that
      // blocks nothing — a second Alert opened while this one closes could hang the screen
      onPress: () => {
        void Clipboard.setStringAsync(SUPPORT_EMAIL).then(() => showToast(t('contact.copied')));
      },
    },
  ]);
}
