// ===========================================
// SmartProperty - Currency Utilities (backend)
// ===========================================

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
 * Convert stored integer amount (e.g. 12345 cents) to major unit (123.45).
 */
export function toMajorUnits(amount: number, currency: string): number {
  const factor = getMinorUnitFactor(currency);
  return Math.round((amount / factor) * 1_000_000) / 1_000_000;
}
