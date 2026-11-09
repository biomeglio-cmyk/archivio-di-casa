import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR } from '@/constants/brand';
import { getCategory } from '@/constants/categories';
import { getDocument } from '@/data/documents';
import { getPerson } from '@/data/people';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/utils/dates';

// Detail of one document. Used by the document/[id] screen of every tab.
export default function DocumentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const document = getDocument(id);

  if (!document) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: '' }} />
        <ThemedText themeColor="textSecondary">Documento non trovato.</ThemedText>
      </View>
    );
  }

  const category = getCategory(document.categoryId);
  const person = document.personId ? getPerson(document.personId) : undefined;

  // Label/value pairs shown under the header; missing values are skipped
  const details = [
    { label: 'Categoria', value: category?.name },
    { label: 'Persona', value: person?.name },
    { label: 'Scadenza', value: document.expiresAt ? formatDate(document.expiresAt) : 'Nessuna' },
    { label: 'Note', value: document.notes },
  ].filter((d) => d.value);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '' }} />

      {category && (
        <LinearGradient colors={[category.colors.top, category.colors.bottom]} style={styles.header}>
          <SymbolView name={category.symbol} tintColor={category.colors.text} size={40} />
          <Text style={[styles.title, { color: category.colors.text }]}>{document.title}</Text>
        </LinearGradient>
      )}

      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        {details.map((d, index) => (
          <View
            key={d.label}
            style={[
              styles.detailRow,
              index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.backgroundSelected },
            ]}>
            <ThemedText themeColor="textSecondary">{d.label}</ThemedText>
            <ThemedText style={styles.detailValue}>{d.value}</ThemedText>
          </View>
        ))}
      </View>

      {/* Plain button for now: it becomes the gradient button in step 7 */}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/send-document/[id]', params: { id: document.id } })}
        style={({ pressed }) => [styles.sendButton, pressed && { opacity: 0.8 }]}>
        <SymbolView name="paperplane.fill" tintColor="#FFFFFF" size={18} />
        <Text style={styles.sendLabel}>Invia</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 28,
    borderRadius: 24,
    borderCurve: 'continuous',
    gap: 16,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 700,
  },
  card: {
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 14,
  },
  detailValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: BRAND_COLOR,
  },
  sendLabel: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 600,
  },
});
