// Readable file names: "Carta d'identità" + "Step" → "carta-identita-step"

// Removes accents (à → a), Italian elisions (d', l', un'…), and anything that isn't a-z or 0-9
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents split off by NFD
    .toLowerCase()
    .replace(/\b[a-z]+['’]/g, ' ') // elisions: "d'", "l'", "un'", "dell'", "quest'"
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function fileBaseName(parts: (string | null | undefined)[]): string {
  return slugify(parts.filter(Boolean).join(' ')) || 'documento';
}
