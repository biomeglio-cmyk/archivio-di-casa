import type { Href } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import type { SFSymbol } from 'expo-symbols';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { getLastBackupDate, isBackupDue } from '@/backup/backup-layout';
import { listDocumentsWithExpiry } from '@/db/documents';
import type { CategoryColors, DocumentListItem } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { t as translate, useI18n } from '@/i18n';
import { getPreferences, reminderDaysFor, usePreferences } from '@/settings/preferences';
import { describeDistance, parseISODate } from '@/utils/dates';
import { daysUntil } from '@/utils/deadlines';
import { dayAndMonth } from '@/utils/folder';
import { formatEuro } from '@/utils/money';

// The "Notifiche" panel (docs/design/Notifiche.dc.html): what the phone has notified in the last
// 7 days, rebuilt from the data (the same rules as the scheduled reminders), plus the backup
// reminder. Read / unread lives on the phone; only notifications from the moment this feature
// arrived count as unread, so the badges don't start with old ones.

const WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const STATE_KEY = 'notifications.feed';
const BACKUP_COLORS: CategoryColors = { top: '#86B4F7', bottom: '#6494EE', text: '#FFFFFF', shadow: '100, 148, 238' };

export type FeedItem = {
  id: string; // includes the moment, so a new reminder for the same document is a new item
  at: number; // when it was notified (ms)
  title: string;
  body: string;
  symbol: SFSymbol;
  colors: CategoryColors;
  href: Href;
};

type ReadState = { since: number; readAt: number; readIds: string[] };

let state: ReadState | null = null;
const listeners = new Set<() => void>();

function readState(): ReadState {
  if (state) return state;
  try {
    const saved = Storage.getItemSync(STATE_KEY);
    if (saved) {
      state = JSON.parse(saved) as ReadState;
      return state;
    }
  } catch {
    // start fresh below
  }
  const now = Date.now();
  state = { since: now, readAt: now, readIds: [] };
  writeState(state);
  return state;
}

function writeState(next: ReadState) {
  state = next;
  try {
    Storage.setItemSync(STATE_KEY, JSON.stringify(next));
  } catch {
    // the read marks last until the app closes
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// "Segna come lette"
export function markAllRead() {
  writeState({ ...readState(), readAt: Date.now(), readIds: [] });
}

// A tap on one notification
export function markRead(id: string) {
  const current = readState();
  if (current.readIds.includes(id)) return;
  writeState({ ...current, readIds: [...current.readIds, id].slice(-200) });
}

export function isUnread(item: FeedItem, read: ReadState): boolean {
  return item.at > read.since && item.at > read.readAt && !read.readIds.includes(item.id);
}

// The last moment (≤ now) a deadline reminder rang: its reminder day, or the expiry day itself
function lastRing(document: DocumentListItem & { expiresAt: string }, now: number): number | null {
  const { reminderHour: hour, reminderMinute: minute, remindersEnabled } = getPreferences();
  if (!remindersEnabled) return null;
  const days = reminderDaysFor(document.reminderDays);
  if (days < 0) return null; // "Ricordamelo" off
  const expiry = parseISODate(document.expiresAt);
  const at = (offset: number) =>
    new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate() - offset, hour, minute).getTime();
  const rings = [at(days), at(0)].filter((t) => t <= now);
  return rings.length ? Math.max(...rings) : null;
}

type Translate = typeof translate;

function deadlineBody(document: DocumentListItem & { expiresAt: string }, at: number, t: Translate): string {
  const days = daysUntil(document.expiresAt, new Date(at));
  const date = dayAndMonth(document.expiresAt);
  const when =
    days < 0
      ? t('notificationFeed.expiredOn', { date })
      : days === 0
        ? t('notificationFeed.expiresToday')
        : t('notificationFeed.expiresOn', { distance: describeDistance(days), date });
  const amount = document.amountCents !== null ? ` ${t('notificationFeed.amount', { amount: formatEuro(document.amountCents) })}` : '';
  const note = document.notes?.split('\n')[0].trim();
  return `${when}${amount}${note ? ` ${note}` : ''}`;
}

// `t` from useI18n in components: a new function when the language changes, so the texts follow it
export function buildFeed(documents: DocumentListItem[], now: number, t: Translate = translate): FeedItem[] {
  const items: FeedItem[] = [];
  for (const document of documents) {
    if (!document.expiresAt || document.paymentStatus === 'paid') continue;
    const dated = document as DocumentListItem & { expiresAt: string };
    const at = lastRing(dated, now);
    if (at === null || now - at > WINDOW_DAYS * DAY_MS) continue;
    items.push({
      id: `deadline-${document.id}-${at}`,
      at,
      title: document.title,
      body: deadlineBody(dated, at, t),
      symbol: document.category.isCards ? 'creditcard' : 'doc.text',
      colors: document.category.colors,
      href: { pathname: '/(tabs)/(archive)/document/[id]', params: { id: String(document.id) } },
    });
  }

  if (isBackupDue(now)) {
    const last = getLastBackupDate();
    const { reminderHour, reminderMinute } = getPreferences();
    const today = new Date(now);
    const ring = new Date(today.getFullYear(), today.getMonth(), today.getDate(), reminderHour, reminderMinute).getTime();
    const at = ring <= now ? ring : ring - DAY_MS; // today's reminder hour, or yesterday's
    items.push({
      id: `backup-${new Date(at).toDateString()}`,
      at,
      title: t('notificationFeed.backupTitle'),
      body: last ? t('notificationFeed.backupLate') : t('notificationFeed.backupNever'),
      symbol: 'externaldrive',
      colors: BACKUP_COLORS,
      href: '/backup',
    });
  }
  return items.sort((a, b) => b.at - a.at);
}

// The feed, its read state and the unread count; refreshed when the app comes back and every minute
export function useNotificationFeed() {
  const { data: documents } = useDbQuery(listDocumentsWithExpiry, []);
  const { t } = useI18n();
  usePreferences(); // rebuilt when the reminder settings change
  const read = useSyncExternalStore(subscribe, readState);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 60_000);
    const subscription = AppState.addEventListener('change', (next) => next === 'active' && tick());
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  const items = buildFeed(documents ?? [], now, t);
  const unread = items.filter((item) => isUnread(item, read)).length;
  return { items, read, unread, now };
}
