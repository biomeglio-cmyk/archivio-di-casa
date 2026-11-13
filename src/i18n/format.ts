import { currentLanguage } from '@/i18n';
import { languageInfo } from '@/settings/language';

// Dates, numbers and amounts in the active language (Intl), e.g. "€ 84,20" / "€84.20".

// The Intl locale of the language ("de-DE"…); English is British (day before month, Monday first)
export function intlLocale(): string {
  return languageInfo(currentLanguage()).locale;
}

// Italian and English compose dates from the names (as the design wants them); the other
// languages use the whole Intl format of their locale (word order, "12." in German…)
export function composesDates(): boolean {
  const language = currentLanguage();
  return language === 'it' || language === 'en';
}

const cache = new Map<string, Intl.DateTimeFormat>();
function dateFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${intlLocale()}|${JSON.stringify(options)}`;
  let format = cache.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(intlLocale(), options);
    cache.set(key, format);
  }
  return format;
}

// Month 0–11: "novembre" / "November", short "nov" / "Nov"
export function monthName(month: number, width: 'long' | 'short' = 'long'): string {
  return dateFormat({ month: width }).format(new Date(2026, month, 1));
}

// Day 0 = Sunday … 6 = Saturday: "lunedì" / "Monday", "lun" / "Mon", "L" / "M"
export function weekdayName(day: number, width: 'long' | 'short' | 'narrow' = 'long'): string {
  // 2026-11-01 is a Sunday
  return dateFormat({ weekday: width }).format(new Date(2026, 10, 1 + day));
}

// Monday-first narrow letters for calendar headers: L M M G V S D / M T W T F S S
export function weekdayLetters(): string[] {
  return [1, 2, 3, 4, 5, 6, 0].map((d) => weekdayName(d, 'narrow'));
}

// Monday-first full names, for accessibility
export function weekdayNamesFromMonday(): string[] {
  return [1, 2, 3, 4, 5, 6, 0].map((d) => weekdayName(d, 'long'));
}

// Numbers: "1.250" / "1,250"
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intlLocale(), options).format(value);
}

// Integer cents → "€ 84,20" (Italian, as in the design) / "€84.20"
export function formatMoney(cents: number): string {
  const amount = cents / 100;
  if (currentLanguage() === 'it') {
    return `€\u00A0${formatNumber(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  // One line: the currency and the number never split ("84,20 €", "€84.20")
  return formatNumber(amount, { style: 'currency', currency: 'EUR' }).replace(/ /g, '\u00A0');
}

// The decimal separator of the language: "," / "."
export function decimalSeparator(): string {
  const sample = new Intl.NumberFormat(intlLocale(), { minimumFractionDigits: 1 }).format(1.5);
  return sample.replace(/\d/g, '').charAt(0) || '.';
}
