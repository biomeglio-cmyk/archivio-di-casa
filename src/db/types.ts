import type { SFSymbol } from 'expo-symbols';

// App-side shapes (camelCase). The row types below mirror the SQL columns (snake_case).

export type Person = {
  id: number;
  name: string;
};

export type CategoryColors = {
  top: string; // lighter shade, top of the gradient
  bottom: string; // darker pastel, bottom of the gradient
  text: string; // dark shade for text and icon
};

export type Category = {
  id: number;
  name: string;
  symbol: SFSymbol;
  examples: string | null;
  colors: CategoryColors;
  isBuiltin: boolean;
};

export type FamilyDocument = {
  id: number;
  title: string;
  categoryId: number;
  personId: number | null;
  number: string | null;
  expiresAt: string | null; // 'YYYY-MM-DD', null = never expires
  reminderDays: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentFile = {
  id: number;
  documentId: number;
  path: string; // relative to Paths.document, e.g. 'documents/42-front.jpg'
  side: 'front' | 'back' | null;
  kind: 'image' | 'pdf';
  createdAt: string;
};

// ---- Raw rows as returned by SQLite ----

export type PersonRecord = { id: number; name: string };

export type CategoryRecord = {
  id: number;
  name: string;
  symbol: string;
  examples: string | null;
  color_top: string;
  color_bottom: string;
  color_text: string;
  is_builtin: number;
};

export type DocumentRecord = {
  id: number;
  title: string;
  category_id: number;
  person_id: number | null;
  number: string | null;
  expires_at: string | null;
  reminder_days: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// ---- Shapes returned by list queries ----

export type PersonWithCount = Person & { documentCount: number };
export type CategoryWithCount = Category & { documentCount: number };
export type DocumentListItem = FamilyDocument & { category: Category };
export type DocumentDetail = DocumentListItem & { person: Person | null };
