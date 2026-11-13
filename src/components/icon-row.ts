import type { TextStyle, ViewStyle } from 'react-native';

import { useLargeText } from '@/hooks/use-large-text';

// The shared "icon above the text" rule for every row, button, banner or box that puts an icon (or
// a thumbnail, a date square, an avatar) next to text. At the default size nothing changes; with
// large text (XXL and up, useLargeText) the icon goes on its own line above the text, the text
// takes the whole width and is left-aligned, and a trailing control goes under the text (a switch
// or a check on the right, a value or a button on the left).
//
//   const iconRow = useIconRow();
//   <View style={[styles.row, iconRow.row]}>
//     <Icon />
//     <View style={[styles.texts, iconRow.texts]}>
//       <Text style={[styles.title, iconRow.text]}>…</Text>
//     </View>
//     <Switch style={iconRow.trailingEnd} />
//   </View>
//
// Centered text stays centered only in full-width primary buttons and empty-state titles
// (iconRow.rowCentered for those).
const ROW: ViewStyle = { flexDirection: 'column', alignItems: 'flex-start', gap: 8 };
const ROW_CENTERED: ViewStyle = { flexDirection: 'column', alignItems: 'center', gap: 6 };
const TEXTS: ViewStyle = { flex: 0, flexShrink: 0, alignSelf: 'stretch' };
const TEXT: TextStyle = { textAlign: 'left' };
const TRAILING_END: ViewStyle = { alignSelf: 'flex-end' };
const TRAILING_START: ViewStyle = { alignSelf: 'flex-start' };
// A dashed "add" tile or button (Aggiungi pagina, Nuovo documento, Nuova categoria, Aggiungi una
// persona, Nuova tessera): with large text full width, "+" and the label on one line
const ADD_ROW: ViewStyle = { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 64, paddingHorizontal: 16 };
const ADD_LABEL: TextStyle = { flexShrink: 1, textAlign: 'left' };

export type IconRow = {
  large: boolean;
  row: ViewStyle | null; // the container: a column, items on the left
  rowCentered: ViewStyle | null; // full-width primary buttons and empty states: a centered column
  texts: ViewStyle | null; // the text block: the whole width (no flex: 1 that collapses in a column)
  text: TextStyle | null; // a text that was centered or right-aligned: left-aligned when stacked
  trailingEnd: ViewStyle | null; // a switch or a check under the text, on the right
  trailingStart: ViewStyle | null; // a value, a link or a button under the text, on the left
  addRow: ViewStyle | null; // a dashed "add" tile/button: full width, "+" and label on one line
  addLabel: TextStyle | null;
};

export function useIconRow(): IconRow {
  const large = useLargeText();
  return {
    large,
    row: large ? ROW : null,
    rowCentered: large ? ROW_CENTERED : null,
    texts: large ? TEXTS : null,
    text: large ? TEXT : null,
    trailingEnd: large ? TRAILING_END : null,
    trailingStart: large ? TRAILING_START : null,
    addRow: large ? ADD_ROW : null,
    addLabel: large ? ADD_LABEL : null,
  };
}
