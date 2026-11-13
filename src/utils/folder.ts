import type { DocumentListItem } from '@/db/types';
import { t } from '@/i18n';
import { composesDates } from '@/i18n/format';
import { formatDate, formatDayMonth, formatMonthTitle, parseISODate } from '@/utils/dates';
import { daysUntil } from '@/utils/deadlines';

// The day a document belongs to in its folder (docs/design/Archivio.dc.html, grouped by month):
// its deadline, otherwise the day it was paid, otherwise the day it was added
export function folderDate(document: DocumentListItem): string {
  return document.expiresAt ?? document.paidAt ?? document.createdAt.slice(0, 10);
}

export type MonthGroup = { key: string; title: string; documents: DocumentListItem[] };

// "NOVEMBRE 2026", "OTTOBRE 2026"…: the latest month first; inside a month the folder order
// (the manual order of "Riordina") is kept
export function groupByMonth(documents: DocumentListItem[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  for (const document of documents) {
    const key = folderDate(document).slice(0, 7); // YYYY-MM
    let group = groups.get(key);
    if (!group) {
      const [year, month] = key.split('-').map(Number);
      group = { key, title: formatMonthTitle(year, month - 1), documents: [] };
      groups.set(key, group);
    }
    group.documents.push(document);
  }
  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
}

// "14 novembre" (with the year only when it is not this one)
export function dayAndMonth(iso: string, today: Date = new Date()): string {
  const date = parseISODate(iso);
  if (date.getFullYear() === today.getFullYear()) return formatDayMonth(date);
  // Another year: the whole format of the language ("14 novembre 2027", "2027. november 14.")
  return composesDates() ? `${formatDayMonth(date)} ${date.getFullYear()}` : formatDate(iso, 'long');
}

// Under the name in a folder row: "Scade il 14 novembre", "Pagata il 5 novembre", "Scaduta il…",
// "Aggiunto il…", and the person when there is one
export function folderRowSubtitle(document: DocumentListItem): string {
  let when: string;
  if (document.paymentStatus === 'paid' && document.paidAt) {
    when = t('folder.paidOn', { date: dayAndMonth(document.paidAt) });
  } else if (document.expiresAt) {
    const date = dayAndMonth(document.expiresAt);
    when = daysUntil(document.expiresAt) < 0 ? t('folder.expiredOn', { date }) : t('folder.expiresOn', { date });
  } else {
    when = t('folder.addedOn', { date: dayAndMonth(document.createdAt.slice(0, 10)) });
  }
  return [when, document.personName].filter(Boolean).join(' · ');
}

// "Nuova bolletta", "Nuova tessera" or "Nuovo documento": the dashed tile at the end of a folder
// (called at render time, so the label follows the language)
export function newItemLabel(builtinKey: string | null): string {
  if (builtinKey === 'lightbulb') return t('folder.newItem.bill');
  if (builtinKey === 'creditcard') return t('folder.newItem.card');
  if (builtinKey === 'receipt') return t('folder.newItem.warranty');
  if (builtinKey === 'key') return t('folder.newItem.password');
  return t('folder.newItem.document');
}
