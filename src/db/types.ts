import type { SFSymbol } from 'expo-symbols';

import type { Repeat } from '@/utils/recurrence';

// App-side shapes (camelCase). The row types below mirror the SQL columns (snake_case).

export type Person = {
  id: number;
  name: string;
  photoPath: string | null; // relative to Paths.document; null = initial in a circle
  role: PersonRole | null; // "Chi è"; null = not said
};

// "Chi è" of a family member; 'me' is the owner of the phone ("Tu")
export type PersonRole = 'me' | 'partner' | 'child' | 'parent' | 'sibling' | 'other';

export type CategoryColors = {
  top: string; // start of the gradient (top-left)
  bottom: string; // end of the gradient (bottom-right)
  text: string; // text and icon on the gradient
  // Only in the "Sottomano" palette (docs/design-guide.md); derived from the others when missing:
  shadow?: string; // "r, g, b" of the colored shadow under a tile
  tint?: string; // light tint: inactive filters and round buttons of the section
  onTint?: string; // text and icons on the light tint
  darkTint?: string; // "Tema notte": the tint and the text on it (design guide)
  darkOnTint?: string;
  // "Pastello" in Tema notte: the tile drawn with the dark tint (top a little lighter) and the light
  // text of the section, a thin white border instead of the colored shadow
  night?: { top: string; bottom: string; text: string };
  isNight?: boolean; // these display colors are the night variant (set by forTheme)
};

export type Category = {
  id: number;
  name: string;
  symbol: SFSymbol;
  examples: string | null;
  colors: CategoryColors;
  isBuiltin: boolean;
  builtinKey: string | null; // built-in categories: their original icon, never changes (see V9)
  followsPalette: boolean; // built-in with the colors of "Aspetto" (not a color picked by the user)
  isCards: boolean; // "Tessere e card": shown as a wallet of cards
  isPassword: boolean; // "Password": its documents have "Utente" and a password in the Keychain
  personId: number | null; // "Per chi è"; null = "Tutta la famiglia"
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
  isPinned: boolean; // shown in "Preferiti" on Home
  pinOrder: number;
  barcodeValue: string | null; // cards: the code read by the camera or typed by hand
  barcodeType: string | null; // cards: its format, e.g. 'ean13' (null = typed by hand)
  cardColor: string | null; // cards: background when there is no photo of the front
  username: string | null; // "Password" documents: the user name (the password is in the Keychain)
  coverMode: CoverMode | null; // tile look; null = automatic (photo if there is one, else color)
  coverColor: string | null; // "Colore" cover; null = the category color (follows the palette)
  deletedAt: string | null; // in the "Cestino" since then (ISO); null = a live document
  repeat: Repeat | null; // "Si ripete" of the deadline; null = "Mai"
  docType: string | null; // "Tipo" inside its folder (Luce, Gas…)
  paymentStatus: PaymentStatus | null; // "Da pagare" / "Pagata"; null = no status
  paidAt: string | null; // 'YYYY-MM-DD' when marked "Pagata"
  amountCents: number | null; // "Importo" in euro cents
  password: PasswordInfo | null; // only Password entries (docs/design/NuovaPassword.dc.html)
  createdAt: string;
  updatedAt: string;
};

export type PaymentStatus = 'due' | 'paid';

// "Che cosa salvi" of a Password entry
export type PasswordType = 'site' | 'wifi' | 'pin' | 'other';

// How an entry looks in the lists: a color (one of 7, or 'custom' with its hex) and an icon, or an image
export type PasswordPreview = {
  color: string | null; // key of PASSWORD_COLORS, 'custom', or null = the first (Acqua)
  hex: string | null; // '#RRGGBB' when color is 'custom'
  icon: string | null; // key of PASSWORD_ICONS; null = the icon of the type
  imagePath: string | null; // relative to Paths.document; wins over color and icon
};

// The Password fields that live in SQLite (the password itself is ONLY in the Keychain)
export type PasswordInfo = {
  type: PasswordType;
  customType: string | null; // "Altro": "Allarme", "Cassaforte"…
  url: string | null; // "Sito o app"
  wifiQr: boolean; // Wi-Fi: "QR per gli ospiti"
  preview: PasswordPreview;
};

// How a document looks in the grids: its front photo full-bleed, or a color with the title
export type CoverMode = 'photo' | 'color';

// What a photo is: front/back of a document, front of a card, photo of a card's barcode.
// null for PDFs and for the pages after the second one of a scan (see `page`).
export type FileSide = 'front' | 'back' | 'card_front' | 'barcode';

export type DocumentFile = {
  id: number;
  documentId: number;
  path: string; // relative to Paths.document, e.g. 'documents/42-front.jpg'
  side: FileSide | null;
  kind: 'image' | 'pdf';
  page: number | null; // position of a photo among the pages (1 = front, 2 = back, 3…); null for PDFs and barcodes
  createdAt: string;
};

// ---- Raw rows as returned by SQLite ----

export type PersonRecord = { id: number; name: string; photo_path: string | null; role: string | null };

export type CategoryRecord = {
  id: number;
  name: string;
  symbol: string;
  examples: string | null;
  color_top: string;
  color_bottom: string;
  color_text: string;
  is_builtin: number;
  kind: string | null;
  builtin_key: string | null;
  hidden: number;
  custom_colors: number;
  person_id: number | null;
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
  is_pinned: number;
  pin_order: number;
  barcode_value: string | null;
  barcode_type: string | null;
  card_color: string | null;
  username: string | null;
  cover_mode: CoverMode | null;
  cover_color: string | null;
  deleted_at: string | null;
  repeat_every: number | null;
  repeat_unit: string | null;
  doc_type: string | null;
  payment_status: string | null;
  paid_at: string | null;
  amount_cents: number | null;
  pw_type: string | null;
  pw_custom_type: string | null;
  pw_url: string | null;
  pw_wifi_qr: number | null;
  preview_color: string | null;
  preview_hex: string | null;
  preview_icon: string | null;
  preview_image_path: string | null;
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
  firstImagePath: string | null; // the front of the document or card (never the barcode photo), for thumbnails
  personName: string | null;
};
export type DocumentDetail = DocumentListItem & { person: Person | null };

// A "Versione precedente": the pages a document had before a "Rinnovato" with a new scan
export type DocumentVersion = {
  id: number;
  documentId: number;
  expiresAt: string | null; // the deadline it had then
  archivedAt: string; // when it was replaced (ISO)
  pageCount: number;
};

export type DocumentFileRecord = {
  id: number;
  document_id: number;
  path: string;
  side: FileSide | null;
  kind: 'image' | 'pdf';
  page: number | null;
  created_at: string;
};
