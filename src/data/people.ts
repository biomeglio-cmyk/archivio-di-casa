import type { SFSymbol } from 'expo-symbols';

// A family member who owns documents
export type Person = {
  id: string;
  name: string;
  symbol: SFSymbol;
};

// Fake data for the app skeleton
export const PEOPLE: Person[] = [
  { id: 'step', name: 'Step', symbol: 'person.crop.circle' },
  { id: 'mamma', name: 'Mamma', symbol: 'person.crop.circle' },
  { id: 'papa', name: 'Papà', symbol: 'person.crop.circle' },
];

export function getPerson(id: string): Person | undefined {
  return PEOPLE.find((p) => p.id === id);
}
