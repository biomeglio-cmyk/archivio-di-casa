import { parseISODate } from '@/utils/dates';

const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days from today to the given ISO date (negative = in the past)
export function daysUntil(iso: string, today: Date = new Date()): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((parseISODate(iso).getTime() - start.getTime()) / DAY_MS);
}
