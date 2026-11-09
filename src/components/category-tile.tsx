import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';

import { confirmDeleteCategory } from '@/actions/delete-actions';
import { FONTS } from '@/constants/brand';
import type { Category } from '@/db/types';

type Props = {
  category: Category;
  documentCount: number;
  size: { width: number; height: number }; // decided by the grid, so all tiles match
};

// Pastel tile of the archive grid: lighter at the top, darker at the bottom.
// Long-press for "Modifica" and, for custom categories, "Elimina".
export function CategoryTile({ category, documentCount, size }: Props) {
  const db = useSQLiteContext();
  const { colors } = category;

  return (
    <Link href={{ pathname: '/category/[id]', params: { id: String(category.id) } }} asChild>
      <Link.Trigger>
        {/* Static style: a function style would be dropped when Link merges its props */}
        <Pressable style={size}>
          <LinearGradient colors={[colors.top, colors.bottom]} style={styles.tile}>
            <SymbolView name={category.symbol} tintColor={colors.text} size={28} />
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
              {category.name}
            </Text>
            <Text style={[styles.count, { color: colors.text }]} numberOfLines={1}>
              {documentCount === 1 ? '1 documento' : `${documentCount} documenti`}
            </Text>
          </LinearGradient>
        </Pressable>
      </Link.Trigger>
      <Link.Menu>
        <Link.MenuAction
          title="Modifica"
          icon="pencil"
          onPress={() => router.push({ pathname: '/category-form', params: { id: String(category.id) } })}
        />
        {/* Built-in categories can't be deleted, so the action is hidden for them */}
        <Link.MenuAction
          title="Elimina"
          icon="trash"
          destructive
          hidden={category.isBuiltin}
          onPress={() => confirmDeleteCategory(db, category)}
        />
      </Link.Menu>
    </Link>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    padding: 14,
    borderRadius: 20,
    borderCurve: 'continuous',
  },
  name: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: FONTS.titleSemiBold,
    marginTop: 'auto', // pushes name and count to the bottom of the tile
  },
  count: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 500,
    opacity: 0.75,
  },
});
