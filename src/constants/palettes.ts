import { BUILTIN_ORDER } from '@/db/builtin-categories';
import type { CategoryColors } from '@/db/types';

// "Aspetto": 6 palettes for the 13 built-in categories. Each one lists [top, bottom, text] in the
// order of BUILTIN_ORDER (documents, cards, utilities, home, insurance, warranties, car, 730,
// colf, school, pet, password, other). Custom categories keep their own color, and the
// brand pink #FF4F64 never changes.

export type PaletteId = 'pastel' | 'vivid' | 'earth' | 'sea' | 'sunset' | 'night';

export type Palette = {
  id: PaletteId;
  name: string;
  colors: CategoryColors[]; // 13, in BUILTIN_ORDER order
};

type Triple = [top: string, bottom: string, text: string];
const toColors = ([top, bottom, text]: Triple): CategoryColors => ({ top, bottom, text });

const OTHER_PALETTES: { id: PaletteId; name: string; colors: Triple[] }[] = [
  {
    id: 'vivid',
    name: 'Vivace',
    colors: [
      ['#4C8DF6', '#2F6FDB', '#FFFFFF'],
      ['#8B5CF6', '#6D3FE0', '#FFFFFF'],
      ['#F5B321', '#E09A00', '#3A2700'],
      ['#2FB36B', '#1E9454', '#FFFFFF'],
      ['#17A9BE', '#0D8A9C', '#FFFFFF'],
      ['#F2643D', '#D9482A', '#FFFFFF'],
      ['#6B7686', '#525C6B', '#FFFFFF'],
      ['#E5487F', '#C92F66', '#FFFFFF'],
      ['#C7843F', '#A86A2A', '#FFFFFF'],
      ['#5B5FE0', '#4246C4', '#FFFFFF'],
      ['#9BC53D', '#7FA82A', '#FFFFFF'], // pet
      ['#3E8E7E', '#2D7365', '#FFFFFF'], // password
      ['#8E8E96', '#74747C', '#FFFFFF'],
    ],
  },
  {
    id: 'earth',
    name: 'Terra',
    colors: [
      ['#E6E1D6', '#CFC6B3', '#4A3F2C'],
      ['#E3DCE2', '#C9BCC6', '#4B3646'],
      ['#F1E2C3', '#DDC394', '#5C4416'],
      ['#DDE4D2', '#BFCCA8', '#3C4A26'],
      ['#D8E2DD', '#B4C7BE', '#2E4A3F'],
      ['#EED8CC', '#D9B29E', '#6A3721'],
      ['#E2E0DC', '#C7C3BC', '#46423B'],
      ['#EAD6D6', '#D3B1B1', '#5E2F2F'],
      ['#EBDCCB', '#D4B99A', '#5A3D1F'],
      ['#DCDDE6', '#BDBFCF', '#373A55'],
      ['#E4E6CF', '#C9CDA2', '#474A22'], // pet
      ['#DCE2DF', '#BAC6C1', '#33443E'], // password
      ['#E8E6E1', '#D0CDC6', '#4A4740'],
    ],
  },
  {
    id: 'sea',
    name: 'Mare',
    colors: [
      ['#E3F0FB', '#B9D8F2', '#174A78'],
      ['#E6EEFA', '#C2D2F0', '#2A3F7A'],
      ['#F7F1E3', '#E6D6B0', '#5C4A1E'],
      ['#E1F4EF', '#B3E2D5', '#165C4C'],
      ['#DDF3F7', '#A9DEE8', '#0B5563'],
      ['#FBECE6', '#F1CABB', '#7A3A25'],
      ['#E8EDF2', '#C8D3DE', '#33475B'],
      ['#F0E9F5', '#D7C6E6', '#4C3366'],
      ['#F3ECE2', '#DECBB0', '#5A4425'],
      ['#E4E8FA', '#BEC7F0', '#28357A'],
      ['#E6F3E6', '#BFDDBF', '#2E5A2E'], // pet
      ['#E3ECEC', '#BCD0D0', '#2C4848'], // password
      ['#EEF1F4', '#D3DAE1', '#3F4B57'],
    ],
  },
  {
    id: 'sunset',
    name: 'Tramonto',
    colors: [
      ['#FDE8E4', '#F7C3B8', '#7A2E20'],
      ['#FBE6EF', '#F2BCD3', '#7A2148'],
      ['#FFF1DC', '#FCD49A', '#7A4A00'],
      ['#FFF4E0', '#F9D9A6', '#6E4A12'],
      ['#FCE9DF', '#F4C6AE', '#7A3B1C'],
      ['#FFE5E0', '#FBB9AD', '#8A2A1C'],
      ['#F6EBE6', '#E3CFC6', '#5A4038'],
      ['#FDE4EC', '#F6B5CB', '#86224A'],
      ['#FBEADB', '#F0C9A3', '#73411A'],
      ['#F7E6F2', '#E6BEDA', '#6A2A5A'],
      ['#FFF6D9', '#F7E0A0', '#6B5214'], // pet
      ['#F3E8EA', '#DDC2C7', '#5A3640'], // password
      ['#F5EFEC', '#E2D6D0', '#544641'],
    ],
  },
  {
    id: 'night',
    name: 'Notte',
    colors: [
      ['#22324F', '#1A2740', '#BFD3F7'],
      ['#2E2550', '#231C40', '#D2C6F6'],
      ['#3D3218', '#2F2612', '#F3D896'],
      ['#1C3A2A', '#152D20', '#AEE3C2'],
      ['#173A40', '#112D32', '#A6DEE6'],
      ['#432420', '#341B18', '#F6BBAE'],
      ['#2A2F38', '#20242B', '#C9D0DB'],
      ['#41213A', '#33192D', '#F2B6D4'],
      ['#3B2C1E', '#2D2117', '#E9C9A4'],
      ['#25284D', '#1C1F3D', '#C3C6F5'],
      ['#2E3A1A', '#232D13', '#D3E6A8'], // pet
      ['#223532', '#1A2926', '#B4D6CF'], // password
      ['#2C2C30', '#222225', '#CFCFD6'],
    ],
  },
];

export const DEFAULT_PALETTE: PaletteId = 'pastel';

export const PALETTES: Palette[] = [
  // Pastello: the original colors, the same the database was created with
  { id: 'pastel', name: 'Pastello', colors: BUILTIN_ORDER.map((c) => c.colors) },
  ...OTHER_PALETTES.map((p) => ({ id: p.id, name: p.name, colors: p.colors.map(toColors) })),
];
