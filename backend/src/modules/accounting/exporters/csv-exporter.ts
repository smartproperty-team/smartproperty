// ===========================================
// SmartProperty - CSV Exporter
// ===========================================

import type { ExportRow } from './payment-rows';

const HEADERS: Array<{ key: keyof ExportRow; label: string }> = [
  { key: 'id', label: 'Payment ID' },
  { key: 'paidAt', label: 'Paid At' },
  { key: 'createdAt', label: 'Created At' },
  { key: 'type', label: 'Type' },
  { key: 'method', label: 'Method' },
  { key: 'status', label: 'Status' },
  { key: 'currency', label: 'Currency' },
  { key: 'tenantName', label: 'Tenant' },
  { key: 'propertyTitle', label: 'Property' },
  { key: 'amount', label: 'Amount' },
  { key: 'fee', label: 'Fee' },
  { key: 'netAmount', label: 'Net' },
  { key: 'refundedAmount', label: 'Refunded' },
  { key: 'stripePaymentIntentId', label: 'Stripe PI' },
  { key: 'description', label: 'Description' },
];

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str: string;
  if (value instanceof Date) {
    str = value.toISOString();
  } else if (typeof value === 'number') {
    // Use dot decimal so spreadsheets parse it as a number regardless of locale.
    str = String(value);
  } else {
    str = String(value);
  }
  const needsQuoting = /[",\r\n]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}

export function toCsv(rows: ExportRow[]): string {
  const header = HEADERS.map((h) => escapeCsvField(h.label)).join(',');
  const body = rows
    .map((row) =>
      HEADERS.map((h) => escapeCsvField(row[h.key])).join(','),
    )
    .join('\n');
  // Prepend BOM so Excel opens UTF-8 CSV correctly.
  return `﻿${header}\n${body}`;
}
