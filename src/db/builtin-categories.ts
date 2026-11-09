import type { SFSymbol } from 'expo-symbols';

import type { CategoryColors } from '@/db/types';

type BuiltinCategory = {
  name: string;
  symbol: SFSymbol;
  examples: string;
  colors: CategoryColors;
};

// The 11 base categories, inserted by migration V1 in every build (they are part of the app,
// not demo data). Never edit this list to change existing installs: write a new migration.
export const BUILTIN_CATEGORIES: BuiltinCategory[] = [
  {
    name: 'Identità',
    symbol: 'person.text.rectangle',
    examples: "Carta d'identità, patente, passaporto",
    colors: { top: '#EEF4FF', bottom: '#C7DBFC', text: '#1E4A99' },
  },
  {
    name: 'Tessere e card',
    symbol: 'creditcard',
    examples: 'Tessere soci, fedeltà, palestra',
    colors: { top: '#F4EFFF', bottom: '#D9CCFA', text: '#4B2A9A' },
  },
  {
    name: 'Utenze',
    symbol: 'lightbulb',
    examples: 'Luce, gas, acqua, internet',
    colors: { top: '#FFF8E6', bottom: '#FBE1A4', text: '#7A5200' },
  },
  {
    name: 'Casa',
    symbol: 'house',
    examples: 'Affitto, mutuo, condominio',
    colors: { top: '#EBF8EF', bottom: '#BCE6CA', text: '#1E6B3E' },
  },
  {
    name: 'Assicurazioni',
    symbol: 'shield',
    examples: 'Auto, casa, salute, vita',
    colors: { top: '#E8F7F9', bottom: '#B4E2E8', text: '#0E5E6B' },
  },
  {
    name: 'Garanzie e scontrini',
    symbol: 'receipt',
    examples: 'Elettrodomestici, elettronica',
    colors: { top: '#FFF0EC', bottom: '#FAC9BF', text: '#9A3324' },
  },
  {
    name: 'Auto e veicoli',
    symbol: 'car',
    examples: 'Libretto, bollo, revisione',
    colors: { top: '#F1F3F7', bottom: '#D0D7E1', text: '#3A4558' },
  },
  {
    name: 'Spese per il 730',
    symbol: 'cross.case',
    examples: 'Farmacia, visite, scuola, sport',
    colors: { top: '#FFEEF4', bottom: '#F8C3D5', text: '#92284F' },
  },
  {
    name: 'Lavoro domestico',
    symbol: 'bubbles.and.sparkles',
    examples: 'Ricevute e contributi colf',
    colors: { top: '#FCF3E9', bottom: '#EED3B2', text: '#7A4A1C' },
  },
  {
    name: 'Scuola e famiglia',
    symbol: 'backpack',
    examples: 'Iscrizioni, certificati, pagelle',
    colors: { top: '#EFF0FF', bottom: '#CDD0F9', text: '#33368F' },
  },
  {
    name: 'Altro',
    symbol: 'folder',
    examples: 'Qualsiasi altro documento',
    colors: { top: '#F5F5F7', bottom: '#DCDCE1', text: '#4A4A52' },
  },
];
