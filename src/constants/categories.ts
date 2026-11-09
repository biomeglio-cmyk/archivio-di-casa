import type { SFSymbol } from 'expo-symbols';

// Three shades of the same pastel color for a category
export type CategoryColors = {
  top: string;    // lighter shade, top of the gradient
  bottom: string; // darker pastel, bottom of the gradient
  text: string;   // dark shade for text and icon
};

// Shape of a category: every category must have these fields
export type Category = {
  id: string;
  name: string;
  symbol: SFSymbol;
  examples: string;
  colors: CategoryColors;
};

// The 11 categories of the archive
export const CATEGORIES: Category[] = [
  {
    id: 'identity',
    name: 'Identità',
    symbol: 'person.text.rectangle',
    examples: "Carta d'identità, patente, passaporto",
    colors: { top: '#EEF4FF', bottom: '#C7DBFC', text: '#1E4A99' },
  },
  {
    id: 'cards',
    name: 'Tessere e card',
    symbol: 'creditcard',
    examples: 'Tessere soci, fedeltà, palestra',
    colors: { top: '#F4EFFF', bottom: '#D9CCFA', text: '#4B2A9A' },
  },
  {
    id: 'utilities',
    name: 'Utenze',
    symbol: 'lightbulb',
    examples: 'Luce, gas, acqua, internet',
    colors: { top: '#FFF8E6', bottom: '#FBE1A4', text: '#7A5200' },
  },
  {
    id: 'home',
    name: 'Casa',
    symbol: 'house',
    examples: 'Affitto, mutuo, condominio',
    colors: { top: '#EBF8EF', bottom: '#BCE6CA', text: '#1E6B3E' },
  },
  {
    id: 'insurance',
    name: 'Assicurazioni',
    symbol: 'shield',
    examples: 'Auto, casa, salute, vita',
    colors: { top: '#E8F7F9', bottom: '#B4E2E8', text: '#0E5E6B' },
  },
  {
    id: 'warranties',
    name: 'Garanzie e scontrini',
    symbol: 'receipt',
    examples: 'Elettrodomestici, elettronica',
    colors: { top: '#FFF0EC', bottom: '#FAC9BF', text: '#9A3324' },
  },
  {
    id: 'vehicles',
    name: 'Auto e veicoli',
    symbol: 'car',
    examples: 'Libretto, bollo, revisione',
    colors: { top: '#F1F3F7', bottom: '#D0D7E1', text: '#3A4558' },
  },
  {
    id: 'tax',
    name: 'Spese per il 730',
    symbol: 'cross.case',
    examples: 'Farmacia, visite, scuola, sport',
    colors: { top: '#FFEEF4', bottom: '#F8C3D5', text: '#92284F' },
  },
  {
    id: 'domestic-work',
    name: 'Lavoro domestico',
    symbol: 'bubbles.and.sparkles',
    examples: 'Ricevute e contributi colf',
    colors: { top: '#FCF3E9', bottom: '#EED3B2', text: '#7A4A1C' },
  },
  {
    id: 'school-family',
    name: 'Scuola e famiglia',
    symbol: 'backpack',
    examples: 'Iscrizioni, certificati, pagelle',
    colors: { top: '#EFF0FF', bottom: '#CDD0F9', text: '#33368F' },
  },
  {
    id: 'other',
    name: 'Altro',
    symbol: 'folder',
    examples: 'Qualsiasi altro documento',
    colors: { top: '#F5F5F7', bottom: '#DCDCE1', text: '#4A4A52' },
  },
];

// Finds a category by id (undefined if it does not exist)
export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
