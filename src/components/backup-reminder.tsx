import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Storage from 'expo-sqlite/kv-store';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { getLastBackupDate } from '@/backup/backup-layout';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR } from '@/constants/brand';
import { useTheme } from '@/hooks/use-theme';

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_DAYS = 30; // an older backup is worth renewing
const MIN_DOCUMENTS = 5; // never backed up: remind only when there is something to lose
const SNOOZE_DAYS = 7; // the ✕ hides the card for a week
const SNOOZE_KEY = 'backup.reminderSnoozedUntil';

function snoozedUntil(): number {
  try {
    return Number(Storage.getItemSync(SNOOZE_KEY) ?? 0);
  } catch {
    return 0;
  }
}

// What the card says, or null when it should not be shown
function reminderText(documentCount: number, now = Date.now()): string | null {
  if (now < snoozedUntil()) return null;
  const last = getLastBackupDate();
  if (!last) return documentCount >= MIN_DOCUMENTS ? 'Non hai ancora fatto un backup' : null;
  const days = Math.floor((now - last.getTime()) / DAY_MS);
  return days > STALE_DAYS ? `Ultimo backup ${days} giorni fa` : null;
}

// Discreet card on Home, above the categories: the last backup is more than 30 days old (or there
// is none and at least 5 documents). "Fai il backup" opens Backup; ✕ hides it for 7 days.
// Checked again every time Home comes back on screen (e.g. after making a backup).
export function BackupReminder({ documentCount }: { documentCount: number }) {
  const theme = useTheme();
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(useCallback(() => setNow(Date.now()), []));

  const text = reminderText(documentCount, now);
  if (!text) return null;

  function snooze() {
    try {
      Storage.setItemSync(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * DAY_MS));
    } catch {
      // without storage it simply comes back next time
    }
    setNow(Date.now());
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <SymbolView name="externaldrive.badge.icloud" tintColor={BRAND_COLOR} size={24} />
      <View style={styles.texts}>
        <ThemedText style={styles.title}>{text}</ThemedText>
        <Pressable onPress={() => router.push('/backup')} accessibilityRole="button" hitSlop={8} style={styles.action}>
          <Text style={styles.actionText}>Fai il backup</Text>
        </Pressable>
      </View>
      <Pressable
        onPress={snooze}
        accessibilityRole="button"
        accessibilityLabel="Nascondi per 7 giorni"
        hitSlop={10}
        style={styles.close}>
        <SymbolView name="xmark" tintColor={theme.textSecondary} size={14} weight="semibold" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontWeight: 600,
  },
  action: {
    alignSelf: 'flex-start',
    minHeight: 32,
    justifyContent: 'center',
  },
  actionText: {
    color: BRAND_COLOR,
    fontSize: 17,
  },
  close: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
