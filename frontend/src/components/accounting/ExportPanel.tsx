// ===========================================
// SmartProperty - Accounting Export Panel
// ===========================================

import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useState } from 'react';
import {
  accountingService,
  downloadBlob,
} from '../../services/accounting.service';
import {
  AccountingPaymentMethod,
  AccountingPaymentStatus,
  AccountingPaymentType,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
  type AnalyticsQuery,
} from '../../types/accounting';

interface ExportPanelProps {
  startDate: string;
  endDate: string;
}

const TYPE_OPTIONS = Object.values(AccountingPaymentType);
const METHOD_OPTIONS = Object.values(AccountingPaymentMethod);
const STATUS_OPTIONS = Object.values(AccountingPaymentStatus);

export function ExportPanel({ startDate, endDate }: ExportPanelProps) {
  const [selectedTypes, setSelectedTypes] = useState<AccountingPaymentType[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<AccountingPaymentMethod[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<AccountingPaymentStatus[]>([
    AccountingPaymentStatus.COMPLETED,
  ]);
  const [downloading, setDownloading] = useState<'csv' | 'xlsx' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = <T,>(value: T, current: T[], setter: (next: T[]) => void) => {
    if (current.includes(value)) {
      setter(current.filter((v) => v !== value));
    } else {
      setter([...current, value]);
    }
  };

  const handleDownload = async (format: 'csv' | 'xlsx') => {
    setDownloading(format);
    setError(null);
    try {
      const query: AnalyticsQuery = {
        startDate,
        endDate,
        type: selectedTypes.length ? selectedTypes : undefined,
        method: selectedMethods.length ? selectedMethods : undefined,
        status: selectedStatuses.length ? selectedStatuses : undefined,
      };
      const blob = await accountingService.exportPayments(format, query);
      const filename = `payments_${startDate}_${endDate}.${format}`;
      downloadBlob(blob, filename);
    } catch (err) {
      const msg = err as { response?: { data?: { message?: string } }; message?: string };
      setError(
        msg.response?.data?.message || msg.message || 'Export failed.',
      );
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Download className="h-4 w-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-gray-900">
          Export payments
        </h3>
      </div>

      <p className="text-xs text-gray-600">
        Download all payments matching the date range and filters below.
        Amounts are exported in major units (EUR, TND) so you can sum them
        directly in your accounting tool.
      </p>

      {/* Filter chips */}
      <div className="space-y-3">
        <FilterRow
          label="Type"
          options={TYPE_OPTIONS}
          selected={selectedTypes}
          labels={PAYMENT_TYPE_LABELS}
          onToggle={(v) => toggle(v, selectedTypes, setSelectedTypes)}
        />
        <FilterRow
          label="Method"
          options={METHOD_OPTIONS}
          selected={selectedMethods}
          labels={PAYMENT_METHOD_LABELS}
          onToggle={(v) => toggle(v, selectedMethods, setSelectedMethods)}
        />
        <FilterRow
          label="Status"
          options={STATUS_OPTIONS}
          selected={selectedStatuses}
          labels={PAYMENT_STATUS_LABELS}
          onToggle={(v) => toggle(v, selectedStatuses, setSelectedStatuses)}
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleDownload('csv')}
          disabled={downloading !== null}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileText className="h-4 w-4" />
          {downloading === 'csv' ? 'Preparing CSV…' : 'Download CSV'}
        </button>
        <button
          type="button"
          onClick={() => void handleDownload('xlsx')}
          disabled={downloading !== null}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileSpreadsheet className="h-4 w-4" />
          {downloading === 'xlsx' ? 'Preparing Excel…' : 'Download Excel'}
        </button>
      </div>
    </div>
  );
}

interface FilterRowProps<T extends string> {
  label: string;
  options: readonly T[];
  selected: T[];
  labels: Record<T, string>;
  onToggle: (value: T) => void;
}

function FilterRow<T extends string>({
  label,
  options,
  selected,
  labels,
  onToggle,
}: FilterRowProps<T>) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-indigo-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {labels[opt]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
