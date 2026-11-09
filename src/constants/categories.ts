// Shape of a category: every category must have these fields
export type Category = {
  id: string;
  name: string;
  icon: string;
  examples: string;
};

// The 11 categories of the archive
export const CATEGORIES: Category[] = [
  { id: 'identity', name: 'Identità', icon: '🪪', examples: "Carta d'identità, patente, passaporto" },
  { id: 'cards', name: 'Tessere e card', icon: '💳', examples: 'Tessere soci, fedeltà, palestra' },
  { id: 'utilities', name: 'Utenze', icon: '💡', examples: 'Luce, gas, acqua, internet' },
  { id: 'home', name: 'Casa', icon: '🏠', examples: 'Affitto, mutuo, condominio' },
  { id: 'insurance', name: 'Assicurazioni', icon: '🛡️', examples: 'Auto, casa, salute, vita' },
  { id: 'warranties', name: 'Garanzie e scontrini', icon: '🧾', examples: 'Elettrodomestici, elettronica' },
  { id: 'vehicles', name: 'Auto e veicoli', icon: '🚗', examples: 'Libretto, bollo, revisione' },
  { id: 'tax', name: 'Spese per il 730', icon: '💊', examples: 'Farmacia, visite, scuola, sport' },
  { id: 'domestic-work', name: 'Lavoro domestico', icon: '🧹', examples: 'Ricevute e contributi colf' },
  { id: 'school-family', name: 'Scuola e famiglia', icon: '🎒', examples: 'Iscrizioni, certificati, pagelle' },
  { id: 'other', name: 'Altro', icon: '📁', examples: 'Qualsiasi altro documento' },
];