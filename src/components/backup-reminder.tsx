import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getLastBackupDate } from '@/backup/backup-layout';
import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import { FONTS } from '@/constants/typography';

// ✕ hides the notice until the app is opened again (kept in memory only)
let dismissedThisLaunch = false;

// Notice on Home (docs/design/Main.dc.html) while NO backup exists: "Non hai ancora fatto un
// backup", "Fai il backup" opens Backup. Checked again every time Home comes back on screen
// (so it disappears right after the first backup).
export function BackupReminder() {
  const [, refresh] = useState(0);
  useFocusEffect(useCallback(() => refresh((n) => n + 1), []));

  if (dismissedThisLaunch || getLastBackupDate() !== null) return null;

  function dismiss() {
    dismissedThisLaunch = true;
    refresh((n) => n + 1);
  }

  return (
    <View style={styles.box}>
      <View style={styles.icon}>
        <SymbolView name="icloud.and.arrow.up" tintColor={Colors.light.indigo} size={20} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title}>Non hai ancora fatto un backup</Text>
        <Pressable onPress={() => router.push('/backup')} accessibilityRole="link" hitSlop={10}>
          <Text style={styles.link}>Fai il backup</Text>
        </Pressable>
      </View>
      <Pressable
        onPress={dismiss}
        accessibilityRole="button"
        accessibilityLabel="Chiudi avviso"
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
