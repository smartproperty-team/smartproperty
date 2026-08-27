// ===========================================
// SmartProperty - XLSX Exporter
// ===========================================

import ExcelJS from 'exceljs';
import type { Writable } from 'stream';
import type { ExportRow } from './payment-rows';

interface ColumnDef {
  header: string;
  key: keyof ExportRow;
  width: number;
  /** Excel number format string. */
  numFmt?: string;
}

const COLUMNS: ColumnDef[] = [
  { header: 'Payment ID', key: 'id', width: 26 },
  { header: 'Paid At', key: 'paidAt', width: 20, numFmt: 'yyyy-mm-dd hh:mm' },
  { header: 'Created At', key: 'createdAt', width: 20, numFmt: 'yyyy-mm-dd hh:mm' },
  { header: 'Type', key: 'type', width: 14 },
  { header: 'Method', key: 'method', width: 16 },
  { header: 'Status', key: 'status', width: 14 },
  { header: 'Currency', key: 'currency', width: 10 },
  { header: 'Tenant', key: 'tenantName', width: 24 },
  { header: 'Property', key: 'propertyTitle', width: 22 },
  { header: 'Amount', key: 'amount', width: 14, numFmt: '#,##0.00' },
  { header: 'Fee', key: 'fee', width: 12, numFmt: '#,##0.00' },
  { header: 'Net', key: 'netAmount', width: 14, numFmt: '#,##0.00' },
  { header: 'Refunded', key: 'refundedAmount', width: 14, numFmt: '#,##0.00' },
  { header: 'Stripe PI', key: 'stripePaymentIntentId', width: 30 },
  { header: 'Description', key: 'description', width: 32 },
];

export async function writeXlsx(
  rows: ExportRow[],
  output: Writable,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SmartProperty Accounting';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Payments', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = COLUMNS.map((c) => ({
    header: c.header,
    key: c.key as string,
    width: c.width,
    style: c.numFmt ? { numFmt: c.numFmt } : undefined,
  }));

  // Header row styling
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F4F6' },
  };

  // Data rows
  for (const row of rows) {
    sheet.addRow(row as unknown as Record<string, unknown>);
  }

  await workbook.xlsx.write(output);
}
