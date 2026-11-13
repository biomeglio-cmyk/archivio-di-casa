import type { CategoryColors } from '@/db/types';

// "Tema notte (v2)" of docs/design-guide.md: the built-in folders at night, the same for every
// palette (the palette chosen in Aspetto is for the light theme). 135° gradient with white text
// (≥ 4.5:1 at both ends), the section tint and its text, a thin light border instead of a shadow.
// Same order as BUILTIN_ORDER. Categories with a color chosen by the user keep it.
type Row = [top: string, bottom: string, tint: string, onTint: string];

const ROWS: Row[] = [
  ['#4C5EE6', '#3246E2', '#1B1F3A', '#A9B3FF'], // Documenti (derived)
  ['#228468', '#1A6E55', '#14282A', '#7FE0BC'], // Tessere e card
  ['#C2531D', '#AD4423', '#2A1E24', '#FFB089'], // Utenze (Bollette)
  ['#725FEE', '#5A47D6', '#212339', '#C3B8FF'], // Casa
  ['#2E7E8A', '#266973', '#13282D', '#8ADCE8'], // Assicurazioni (derived)
  ['#996D1A', '#80590F', '#2A2420', '#F5CF7A'], // Garanzie e scontrini
  ['#3470E5', '#2F5FCB', '#18233D', '#9EC2FF'], // Auto
  ['#D03C74', '#B03564', '#2A1B2C', '#FFA3C2'], // Spese 730 (Salute)
  ['#CB4A27', '#B14022', '#2A1D1E', '#FFAE98'], // Colf (derived)
  ['#C13EAA', '#AA3796', '#291A2E', '#F2A6E6'], // Scuola (derived)
  ['#5E7E32', '#4E6829', '#1C2617', '#C2E58F'], // Pet (derived)
  ['#23808F', '#1A6A77', '#13283A', '#7FD6E4'], // Password
  ['#6C7493', '#5F6682', '#1F2131', '#C3C7D9'], // Altro (derived)
];

export const NIGHT_FOLDERS: CategoryColors[] = ROWS.map(([top, bottom, darkTint, darkOnTint]) => ({
  top,
  bottom,
  text: '#FFFFFF',
  darkTint,
  darkOnTint,
  isNight: true,
}));
