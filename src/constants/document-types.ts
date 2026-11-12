// "Tipo" suggestions for the built-in categories (by their built-in key, the original icon).
// The user can also type any other value; the values already used in the folder come first.
const SUGGESTIONS: Record<string, string[]> = {
  'person.text.rectangle': ["Carta d'identità", 'Patente', 'Passaporto', 'Tessera sanitaria', 'Codice fiscale'],
  creditcard: ['Fedeltà', 'Palestra', 'Biblioteca', 'Trasporti', 'Associazione'],
  lightbulb: ['Luce', 'Gas', 'Acqua', 'Internet', 'Telefono', 'Rifiuti'],
  house: ['Affitto', 'Mutuo', 'Condominio', 'Manutenzione', 'Contratto'],
  shield: ['Auto', 'Casa', 'Salute', 'Vita', 'Viaggio'],
  receipt: ['Elettrodomestico', 'Elettronica', 'Mobili', 'Scontrino'],
  car: ['Bollo', 'Assicurazione', 'Revisione', 'Tagliando', 'Libretto'],
  'cross.case': ['Farmacia', 'Visita medica', 'Dentista', 'Analisi', 'Sport', 'Scuola'],
  'bubbles.and.sparkles': ['Busta paga', 'Contributi', 'Contratto'],
  backpack: ['Iscrizione', 'Pagella', 'Certificato', 'Mensa', 'Gita'],
  pawprint: ['Libretto sanitario', 'Vaccino', 'Visita', 'Microchip'],
  key: ['Email', 'Banca', 'Social', 'Wi-Fi', 'Lavoro'],
};

// Used ones first, then the suggestions of the category, without duplicates (ignoring case)
export function typeSuggestions(builtinKey: string | null, used: string[]): string[] {
  const all = [...used, ...(builtinKey ? (SUGGESTIONS[builtinKey] ?? []) : [])];
  const seen = new Set<string>();
  return all.filter((value) => {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
