// ===========================================
// SmartProperty - Money Formatting Helpers
// ===========================================
//
// Backend stores payment amounts as integers in the smallest currency unit:
//   • TND → millimes (× 1000)
//   • EUR → cents     (× 100)
//   • USD → cents     (× 100)
//
// `formatMoney` converts the raw integer to a display string for the given
// currency code, using the user's locale.

const MINOR_UNIT_FACTOR: Record<string, number> = {
  TND: 1000,
  EUR: 100,
  USD: 100,
  GBP: 100,
};

const DEFAULT_FACTOR = 100;

export function getMinorUnitFactor(currency: string): number {
  return MINOR_UNIT_FACTOR[currency.toUpperCase()] ?? DEFAULT_FACTOR;
}

/**
 * Convert a stored integer amount to a real number in the major unit.
 * Example: toMajorUnits(150000, 'TND') → 150 (i.e. 150 TND).
 */
export function toMajorUnits(amount: number, currency: string): number {
  return amount / getMinorUnitFactor(currency);
}

/**
 * Format a stored integer amount as a localized currency string.
 * Example: formatMoney(150000, 'TND') → "150.000 TND"
 *          formatMoney(12345,  'EUR') → "123,45 €"
 */
export function formatMoney(
  amount: number,
  currency: string,
  locale: string = 'fr-FR',
): string {
  if (!currency || currency === 'MIXED') {
    // Mixed currencies — show only the value with locale formatting.
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
    }).format(amount);
  }

  const major = toMajorUnits(amount, currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      // TND has 3 decimals (millimes); EUR/USD have 2.
      minimumFractionDigits: currency.toUpperCase() === 'TND' ? 3 : 2,
      maximumFractionDigits: currency.toUpperCase() === 'TND' ? 3 : 2,
    }).format(major);
  } catch {
    // Fallback for unsupported currency codes.
    return `${major.toLocaleString(locale)} ${currency.toUpperCase()}`;
  }
}

/**
 * Compact "1.2k €", "3.4M €" formatting for chart axes.
 */
export function formatMoneyCompact(
  amount: number,
  currency: string,
  locale: string = 'fr-FR',
): string {
  if (!currency || currency === 'MIXED') {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  }
  const major = toMajorUnits(amount, currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(major);
  } catch {
    return `${new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(major)} ${currency.toUpperCase()}`;
  }
}

/** Today as YYYY-MM-DD in the user's timezone — handy for date inputs. */
export function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** First day of the current year. */
export function startOfYear(): string {
  return `${new Date().getFullYear()}-01-01`;
}
