// ===========================================
// SmartProperty - Income Time-Series Chart
// ===========================================

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TimeseriesBucket } from '../../types/accounting';
import { formatMoney, formatMoneyCompact } from '../../utils/money';

interface IncomeLineChartProps {
  data: TimeseriesBucket[];
  currency: string;
  loading?: boolean;
}

export function IncomeLineChart({
  data,
  currency,
  loading = false,
}: IncomeLineChartProps) {
  if (loading) {
    return (
      <div className="h-72 animate-pulse rounded-xl border border-gray-200 bg-gray-100/50" />
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50">
        <p className="text-sm font-medium text-gray-600">No data in this range</p>
        <p className="mt-1 text-xs text-gray-500">
          Try a wider date range or remove filters.
        </p>
      </div>
    );
  }

  return (
    <div className="h-72 rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">
        Gross vs Net over time
      </h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
          <YAxis
            tickFormatter={(value: number) =>
              formatMoneyCompact(value, currency)
            }
            tick={{ fontSize: 11 }}
            width={70}
          />
          <Tooltip
            formatter={
              ((value: number, name: string) => [
                formatMoney(value, currency),
                name,
              ]) as never
            }
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="gross"
            name="Gross"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="net"
            name="Net"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
