import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Storage from 'expo-sqlite/kv-store';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { backupReminderDays, daysSinceLastBackup } from '@/backup/backup-layout';
import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import { FONTS } from '@/constants/typography';

const DAY_MS = 24 * 60 * 60 * 1000;
const SNOOZE_DAYS = 7; // ✕ on the "old backup" notice hides it for a week
const SNOOZE_KEY = 'backup.reminderSnoozedUntil';

// ✕ on the "no backup" notice hides it until the app is opened again (kept in memory only)
let dismissedThisLaunch = false;

function snoozedUntil(): number {
  try {
    return Number(Storage.getItemSync(SNOOZE_KEY) ?? 0);
  } catch {
    return 0;
  }
}

type Notice = { kind: 'none' } | { kind: 'old'; days: number };

// Which notice to show now, or null
function noticeFor(now: number): Notice | null {
  const interval = backupReminderDays(); // "Ricordami di fare il backup": null = "Mai"
  if (interval === null) return null;
  const days = daysSinceLastBackup(now);
  if (days === null) return dismissedThisLaunch ? null : { kind: 'none' };
  if (days <= interval || now < snoozedUntil()) return null;
  return { kind: 'old', days };
}

// Notice on Home (docs/design/Main.dc.html), "Fai il backup" opens Backup:
// - no backup yet: "Non hai ancora fatto un backup"; ✕ hides it until the next launch;
// - last backup older than the chosen frequency (a week or a month; never with "Mai"): "Il tuo ultimo backup è di N giorni fa"; ✕ hides it for 7 days.
// Checked again every time Home comes back on screen (so it goes away right after a backup).
export function BackupReminder() {
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(useCallback(() => setNow(Date.now()), []));

  const notice = noticeFor(now);
  if (!notice) return null;

  function dismiss() {
    if (notice?.kind === 'none') {
      dismissedThisLaunch = true;
    } else {
      try {
        Storage.setItemSync(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * DAY_MS));
      } catch {
        // without storage it simply comes back next time
      }
    }
    setNow(Date.now());
  }

  const text =
    notice.kind === 'none'
      ? 'Non hai ancora fatto un backup'
      : `Il tuo ultimo backup è di ${notice.days} giorni fa`;

  return (
    <View style={styles.box}>
      <View style={styles.icon}>
        <SymbolView name="icloud.and.arrow.up" tintColor={Colors.light.indigo} size={20} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title}>{text}</Text>
        <Pressable onPress={() => router.push('/backup')} accessibilityRole="link" hitSlop={10}>
          <Text style={styles.link}>Fai il backup</Text>
        </Pressable>
      </View>
      <Pressable
        onPress={dismiss}
        accessibilityRole="button"
        accessibilityLabel={notice.kind === 'none' ? 'Chiudi avviso' : 'Nascondi per 7 giorni'}
        hitSlop={4}
        style={styles.close}>
        <SymbolView name="xmark" tintColor={Colors.light.textSecondary} size={16} weight="semibold" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 12,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: Colors.light.paleLilac,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(28, 30, 70, 0.06)',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: Colors.light.text,
  },
  link: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: Colors.light.accent,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
