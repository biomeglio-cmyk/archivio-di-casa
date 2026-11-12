import { router, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { Fragment, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { confirmDeleteCategory } from '@/actions/delete-actions';
import { documentQuickActions } from '@/actions/quick-actions';
import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { Chip, ChipGroup } from '@/components/chip';
import { DocumentTile, DocumentTileFace } from '@/components/document-tile';
import { FOLDER_ROW_INSET, FolderRow } from '@/components/folder-row';
import { PrimaryButton } from '@/components/primary-button';
import { QuickActionMenu, type QuickMenuTarget } from '@/components/quick-action-menu';
import { RoundIconButton } from '@/components/round-icon-button';
import { SearchBar } from '@/components/search-bar';
import { Segmented } from '@/components/segmented';
import { SectionHeader } from '@/components/section-header';
import { SortableTileGrid } from '@/components/sortable-tile-grid';
import { Text } from '@/components/text';
import { TileGrid, TileScrollView } from '@/components/tile-grid';
import { WhiteCard } from '@/components/white-card';
import { Colors, Spacing, tintedShadow } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { isOtherCategory } from '@/db/categories';
import { saveDocumentOrder } from '@/db/documents';
import type { Category, DocumentListItem } from '@/db/types';
import { useDocumentSelection } from '@/hooks/use-document-selection';
import { searchDocuments } from '@/search/search-documents';
import { TAX_CATEGORY_KEY } from '@/send/tax-package';
import { getFolderView, saveFolderView, type FolderView } from '@/settings/folder-view';
import { categoryShadowRgb, categoryTint } from '@/utils/colors';
import { groupByMonth, newItemLabel } from '@/utils/folder';
import { whenBelowLimit } from '@/settings/free-limit';

type Props = {
  category: Category;
  documents: DocumentListItem[];
};

const documentHref = (document: DocumentListItem): Href => ({
  pathname: '/(tabs)/(archive)/document/[id]',
  params: { id: String(document.id) },
});

function countLabel(count: number): string {
  return count === 1 ? '1 documento' : `${count} documenti`;
}

// A folder (docs/design/Archivio.dc.html): round buttons and inactive chips on the category tint,
// title and "12 documenti · 1 da pagare", chips "Tutte" + one per Tipo in the folder (they wrap),
// documents by month in white cards, the dashed "Nuovo…" tile. "Elenco / Griglia" (remembered)
// switches to our tile grid: covers, long press for the quick menu, drag to reorder. "…" opens the sheet with Modifica /
// Cancella categoria; the search button filters this folder.
// Our extras in the same sheet: "Prepara per il commercialista" (Spese 730), "Seleziona e invia"
// (several documents in one PDF) and "Riordina" (the tile grid with drag and drop, which sets the
// manual order used inside each month). Long press on a row: the quick-action menu.
export function FolderScreen({ category, documents }: Props) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const selection = useDocumentSelection();
  const [type, setType] = useState<string | null>(null); // the active chip; null = "Tutte"
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [menu, setMenu] = useState<QuickMenuTarget | null>(null);
  const [view, setView] = useState<FolderView>(getFolderView); // Elenco / Griglia, remembered

  function changeView(next: FolderView) {
    setView(next);
    saveFolderView(next);
  }

  const { tint, onTint, dashed } = categoryTint(category.colors);
  const gradient = [category.colors.top, category.colors.bottom] as const;
  const due = documents.filter((d) => d.paymentStatus === 'due').length;
  const subtitle = [countLabel(documents.length), due > 0 ? `${due} da pagare` : null].filter(Boolean).join(' · ');

  // Chips: the Tipo values present in the folder, in the order they first appear
  const types: string[] = [];
  for (const document of documents) {
    const value = document.docType?.trim();
    if (value && !types.some((t) => t.toLowerCase() === value.toLowerCase())) types.push(value);
  }
  const activeType = type && types.some((t) => t.toLowerCase() === type.toLowerCase()) ? type : null;

  let shown = activeType
    ? documents.filter((d) => d.docType?.trim().toLowerCase() === activeType.toLowerCase())
    : documents;
  if (searchOpen && query.trim()) {
    const results = searchDocuments(shown, query);
    const ids = new Set([...results.documents, ...results.inNotes].map((hit) => hit.document.id));
    shown = shown.filter((d) => ids.has(d.id));
  }
  const filtered = activeType !== null || (searchOpen && query.trim().length > 0);
  const months = groupByMonth(shown);
  const selectedIds = documents.filter((d) => selection.selected.has(d.id)).map((d) => d.id);

  async function saveOrder(items: DocumentListItem[]) {
    try {
      await saveDocumentOrder(
        db,
        'category',
        items.map((d) => d.id),
      );
    } catch (error) {
      Alert.alert('Impossibile salvare l’ordine', error instanceof Error ? error.message : String(error));
    }
  }

  function sendTogether() {
    router.push({ pathname: '/send', params: { ids: selectedIds.join(','), label: category.name } });
    selection.cancel();
  }

  const addDocument = () =>
    whenBelowLimit(() => router.push({ pathname: '/new-document', params: { categoryId: String(category.id) } }));

  const sheetActions: SheetAction[] = [
    {
      key: 'edit',
      label: 'Modifica categoria',
      symbol: 'pencil',
      onPress: () => router.push({ pathname: '/category-form', params: { id: String(category.id) } }),
    },
    ...(category.builtinKey === TAX_CATEGORY_KEY
      ? [
          {
            key: 'tax',
            label: 'Prepara per il commercialista',
            symbol: 'doc.on.doc' as const,
            onPress: () => router.push({ pathname: '/tax-package', params: { categoryId: String(category.id) } }),
          },
        ]
      : []),
    ...(documents.some((d) => d.imageCount > 0)
      ? [{ key: 'select', label: 'Seleziona e invia', symbol: 'checkmark.circle' as const, onPress: selection.start }]
      : []),
    ...(documents.length > 1
      ? [
          {
            key: 'reorder',
            label: 'Riordina',
            symbol: 'arrow.up.arrow.down' as const,
            onPress: () => setReordering(true),
          },
        ]
      : []),
    ...(isOtherCategory(category)
      ? []
      : [
          {
            key: 'delete',
            label: 'Cancella categoria',
            symbol: 'trash' as const,
            destructive: true,
            onPress: () => confirmDeleteCategory(category),
          },
        ]),
  ];

  return (
    <GestureHandlerRootView style={styles.flex}>
      <TileScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.page, { paddingTop: insets.top + 8, paddingBottom: Spacing.belowContent }]}>
        <View style={styles.header}>
          <RoundIconButton
            symbol="chevron.left"
            accessibilityLabel="Indietro"
            background={tint}
            color={Colors.light.text}
            onPress={() => router.back()}
          />
          {selection.selecting || reordering ? (
            <Pressable
              onPress={() => (reordering ? setReordering(false) : selection.cancel())}
              accessibilityRole="button"
              style={[styles.done, { backgroundColor: tint }]}>
              <Text style={[styles.doneText, { color: onTint }]}>{reordering ? 'Fine' : 'Annulla'}</Text>
            </Pressable>
          ) : (
            <View style={styles.headerRight}>
              <RoundIconButton
                symbol="ellipsis"
                accessibilityLabel={`Modifica o cancella la categoria ${category.name}`}
                background={tint}
                color={Colors.light.text}
                onPress={() => setSheetOpen(true)}
              />
              <RoundIconButton
                symbol="magnifyingglass"
                accessibilityLabel={`Cerca in ${category.name}`}
                background={tint}
                color={Colors.light.text}
                onPress={() => {
                  setSearchOpen((open) => !open);
                  setQuery('');
                }}
              />
            </View>
          )}
        </View>

        <Text style={styles.title} accessibilityRole="header">
          {category.name}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {!reordering && (
          <View style={styles.viewSwitch}>
            <Segmented
              values={['Elenco', 'Griglia']}
              selectedIndex={view === 'list' ? 0 : 1}
              onChange={(index) => changeView(index === 0 ? 'list' : 'grid')}
              tint={tint}
              activeColor={onTint}
            />
          </View>
        )}

        {searchOpen && !reordering && (
          <View style={styles.search}>
            <SearchBar value={query} onChangeText={setQuery} placeholder={`Cerca in ${category.name}`} />
          </View>
        )}

        {reordering ? (
          <>
            <Text style={styles.hint}>Tieni premuto e trascina i documenti nell’ordine che preferisci.</Text>
            <View style={styles.grid}>
              <SortableTileGrid
                items={documents}
                keyFor={(document) => document.id}
                labelFor={(document) => document.title}
                renderTile={(document) => <DocumentTileFace document={document} />}
                onOpen={() => undefined}
                onReorder={saveOrder}
                scrollableRef={scrollRef}
                reordering
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.chips}>
              <ChipGroup>
                <Chip
                  label="Tutte"
                  selected={activeType === null}
                  onPress={() => setType(null)}
                  gradient={gradient}
                  tint={tint}
                />
                {types.map((value) => (
                  <Chip
                    key={value}
                    label={value}
                    selected={activeType?.toLowerCase() === value.toLowerCase()}
                    onPress={() => setType(value)}
                    gradient={gradient}
                    tint={tint}
                  />
                ))}
              </ChipGroup>
            </View>

            {view === 'grid' ? (
              <View style={styles.grid}>
                {selection.selecting || filtered ? (
                  // Ticking documents, or a filtered folder: fixed tiles (the order is set on the whole folder)
                  <TileGrid
                    items={shown}
                    keyFor={(document) => document.id}
                    renderTile={(document, size) => (
                      <DocumentTile
                        document={document}
                        size={size}
                        href={documentHref(document)}
                        selection={
                          selection.selecting
                            ? {
                                selected: selection.selected.has(document.id),
                                disabled: document.imageCount === 0,
                                onToggle: () => selection.toggle(document.id),
                              }
                            : undefined
                        }
                      />
                    )}
                  />
                ) : (
                  <SortableTileGrid
                    items={documents}
                    keyFor={(document) => document.id}
                    labelFor={(document) => document.title}
                    renderTile={(document) => <DocumentTileFace document={document} />}
                    actionsFor={(document) => documentQuickActions(db, document, documentHref(document))}
                    onOpen={(document) => router.push(documentHref(document))}
                    onReorder={saveOrder}
                    scrollableRef={scrollRef}
                    add={{ label: newItemLabel(category.builtinKey), onPress: addDocument }}
                  />
                )}
              </View>
            ) : (
              <>
                {months.length === 0 && documents.length > 0 && (
                  <Text style={styles.empty}>Nessun documento trovato.</Text>
                )}

                {months.map((month) => (
                  <View key={month.key} style={styles.month}>
                    <SectionHeader title={month.title} />
                    <WhiteCard style={styles.card}>
                      {month.documents.map((document, index) => (
                        <Fragment key={document.id}>
                          {index > 0 && <View style={styles.separator} />}
                          <FolderRow
                            document={document}
                            actions={documentQuickActions(db, document, documentHref(document))}
                            onPress={() => {
                              if (!selection.selecting) router.push(documentHref(document));
                              else if (document.imageCount > 0) selection.toggle(document.id);
                            }}
                            onLongPress={(rect) =>
                              setMenu({
                                rect,
                                tile: (
                                  <View style={styles.menuTile}>
                                    <FolderRow
                                      document={document}
                                      actions={[]}
                                      onPress={() => undefined}
                                      onLongPress={() => undefined}
                                    />
                                  </View>
                                ),
                                actions: documentQuickActions(db, document, documentHref(document)),
                              })
                            }
                            selection={
                              selection.selecting
                                ? { selected: selection.selected.has(document.id), disabled: document.imageCount === 0 }
                                : undefined
                            }
                          />
                        </Fragment>
                      ))}
                    </WhiteCard>
                  </View>
                ))}

                {!selection.selecting && (
                  <Pressable
                    onPress={addDocument}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.add,
                      { borderColor: dashed },
                      pressed && { backgroundColor: tint },
                    ]}>
                    <SymbolView name="plus" tintColor={onTint} size={24} />
                    <Text style={[styles.addLabel, { color: onTint }]}>{newItemLabel(category.builtinKey)}</Text>
                  </Pressable>
                )}
              </>
            )}
          </>
        )}
      </TileScrollView>

      {selection.selecting && (
        <View style={[styles.sendBar, { bottom: insets.bottom + 90 }]}>
          <PrimaryButton
            label={`Invia insieme (${selectedIds.length})`}
            symbol="square.and.arrow.up"
            disabled={selectedIds.length === 0}
            gradient={gradient}
            shadow={tintedShadow(categoryShadowRgb(category.colors))}
            onPress={sendTogether}
          />
        </View>
      )}

      <ActionSheet
        visible={sheetOpen}
        title={`Categoria ${category.name}`}
        subtitle={countLabel(documents.length)}
        actions={sheetActions}
        onClose={() => setSheetOpen(false)}
      />
      <QuickActionMenu target={menu} onClose={() => setMenu(null)} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  page: {
    gap: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  done: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    justifyContent: 'center',
  },
  doneText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
  title: {
    marginTop: 22,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONTS.bold,
    color: Colors.light.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
  },
  search: {
    marginTop: 18,
  },
  viewSwitch: {
    marginTop: 18,
  },
  chips: {
    marginTop: 18,
  },
  hint: {
    marginTop: 18,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: Colors.light.textOnLilac,
  },
  grid: {
    marginTop: 14,
  },
  empty: {
    marginTop: 26,
    fontSize: 15,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    color: Colors.light.textSecondary,
  },
  month: {
    marginTop: 26,
    gap: 12,
  },
  card: {
    paddingVertical: 4,
  },
  separator: {
    height: 1,
    marginLeft: FOLDER_ROW_INSET,
    marginRight: 16,
    backgroundColor: Colors.light.separator,
  },
  menuTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
  },
  add: {
    marginTop: 14,
    height: 76,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 22,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addLabel: {
    fontSize: 15,
    fontFamily: FONTS.medium,
  },
  sendBar: {
    position: 'absolute',
    left: Spacing.side,
    right: Spacing.side,
  },
});
