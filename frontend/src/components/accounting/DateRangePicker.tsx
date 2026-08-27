// ===========================================
// SmartProperty - Date Range + Granularity Picker
// ===========================================

import {
  AnalyticsGranularity,
} from '../../types/accounting';
import { startOfYear, today } from '../../utils/money';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  granularity: AnalyticsGranularity;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onGranularityChange: (value: AnalyticsGranularity) => void;
  showGranularity?: boolean;
}

const PRESETS: Array<{ label: string; getRange: () => { start: string; end: string } }> = [
  {
    label: 'This year',
    getRange: () => ({ start: startOfYear(), end: today() }),
  },
  {
    label: 'Last 90 days',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 90);
      return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
    },
  },
  {
    label: 'Last 30 days',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
    },
  },
];

export function DateRangePicker({
  startDate,
  endDate,
  granularity,
  onStartDateChange,
  onEndDateChange,
  onGranularityChange,
  showGranularity = true,
}: DateRangePickerProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex flex-col">
        <label className="mb-1 text-xs font-medium text-gray-600">From</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      <div className="flex flex-col">
        <label className="mb-1 text-xs font-medium text-gray-600">To</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {showGranularity && (
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-gray-600">
            Granularity
          </label>
          <select
            value={granularity}
            onChange={(e) =>
              onGranularityChange(e.target.value as AnalyticsGranularity)
            }
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value={AnalyticsGranularity.DAY}>Daily</option>
            <option value={AnalyticsGranularity.WEEK}>Weekly</option>
            <option value={AnalyticsGranularity.MONTH}>Monthly</option>
            <option value={AnalyticsGranularity.QUARTER}>Quarterly</option>
            <option value={AnalyticsGranularity.YEAR}>Yearly</option>
          </select>
        </div>
      )}

      <div className="flex flex-1 flex-wrap items-end justify-end gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              const range = preset.getRange();
              onStartDateChange(range.start);
              onEndDateChange(range.end);
            }}
            className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
