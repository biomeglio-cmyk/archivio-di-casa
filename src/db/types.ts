import type { SFSymbol } from 'expo-symbols';

// App-side shapes (camelCase). The row types below mirror the SQL columns (snake_case).

export type Person = {
  id: number;
  name: string;
  photoPath: string | null; // relative to Paths.document; null = initial in a circle
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
  calendarEventId: string | null; // iOS Calendar event of the expiry, when sync is on
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

export type PersonRecord = { id: number; name: string; photo_path: string | null };

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
  calendar_event_id: string | null;
  created_at: string;
  updated_at: string;
};

// ---- Shapes returned by list queries ----

export type PersonWithCount = Person & {
  documentCount: number;
  expiringCount: number; // documents expiring from today to 30 days from now
};
export type CategoryWithCount = Category & { documentCount: number };
export type DocumentListItem = FamilyDocument & {
  category: Category;
  imageCount: number; // photos attached (0 = no photos: can't go into a combined PDF)
  firstImagePath: string | null; // the front (or the first photo), for thumbnails
  personName: string | null;
};
export type DocumentDetail = DocumentListItem & { person: Person | null };

export type DocumentFileRecord = {
  id: number;
  document_id: number;
  path: string;
  side: 'front' | 'back' | null;
  kind: 'image' | 'pdf';
  created_at: string;
};
