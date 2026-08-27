// ===========================================
// SmartProperty - Accounting Service (Frontend)
// ===========================================

import type {
  AnalyticsQuery,
  BreakdownEntry,
  BreakdownQuery,
  KpisResponse,
  TimeseriesBucket,
} from '../types/accounting';
import { api } from './api';

/**
 * Build query params, dropping undefined and serializing arrays as repeated keys
 * which is what NestJS class-validator + class-transformer expects.
 */
function toParams(query: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v !== undefined && v !== null) params.append(key, String(v));
      }
    } else {
      params.append(key, String(value));
    }
  }
  return params;
}

export const accountingService = {
  async getKpis(query: AnalyticsQuery = {}): Promise<KpisResponse> {
    const params = toParams(query as Record<string, unknown>);
    const response = await api.get<KpisResponse>(
      `/accounting/analytics/kpis?${params.toString()}`,
    );
    return response.data;
  },

  async getTimeseries(query: AnalyticsQuery = {}): Promise<TimeseriesBucket[]> {
    const params = toParams(query as Record<string, unknown>);
    const response = await api.get<TimeseriesBucket[]>(
      `/accounting/analytics/timeseries?${params.toString()}`,
    );
    return response.data;
  },

  async getBreakdown(query: BreakdownQuery = {}): Promise<BreakdownEntry[]> {
    const params = toParams(query as Record<string, unknown>);
    const response = await api.get<BreakdownEntry[]>(
      `/accounting/analytics/breakdown?${params.toString()}`,
    );
    return response.data;
  },

  async exportPayments(
    format: 'csv' | 'xlsx',
    query: AnalyticsQuery = {},
  ): Promise<Blob> {
    const params = toParams(query as Record<string, unknown>);
    const response = await api.get(
      `/accounting/exports/payments.${format}?${params.toString()}`,
      { responseType: 'blob' },
    );
    return response.data as Blob;
  },
};

/**
 * Trigger a browser download of a Blob with the given filename.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
