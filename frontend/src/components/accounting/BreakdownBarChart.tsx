// ===========================================
// SmartProperty - Breakdown Bar Chart
// ===========================================

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BreakdownDimension,
  type BreakdownEntry,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
} from '../../types/accounting';
import { formatMoney, formatMoneyCompact } from '../../utils/money';

interface BreakdownBarChartProps {
  data: BreakdownEntry[];
  dimension: BreakdownDimension;
  currency: string;
  loading?: boolean;
}

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#f97316',
  '#6366f1',
];

function dimensionTitle(dim: BreakdownDimension): string {
  switch (dim) {
    case BreakdownDimension.METHOD:
      return 'By payment method';
    case BreakdownDimension.TYPE:
      return 'By payment type';
    case BreakdownDimension.PROPERTY:
      return 'Top properties';
    case BreakdownDimension.TENANT:
      return 'Top tenants';
  }
}

function labelFor(dim: BreakdownDimension, entry: BreakdownEntry): string {
  if (dim === BreakdownDimension.METHOD) {
    return (
      PAYMENT_METHOD_LABELS[
        entry.key as keyof typeof PAYMENT_METHOD_LABELS
      ] || entry.label
    );
  }
  if (dim === BreakdownDimension.TYPE) {
    return (
      PAYMENT_TYPE_LABELS[entry.key as keyof typeof PAYMENT_TYPE_LABELS] ||
      entry.label
    );
  }
  return entry.label;
}

export function BreakdownBarChart({
  data,
  dimension,
  currency,
  loading = false,
}: BreakdownBarChartProps) {
  if (loading) {
    return (
      <div className="h-72 animate-pulse rounded-xl border border-gray-200 bg-gray-100/50" />
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50">
        <p className="text-sm font-medium text-gray-600">
          No data for this breakdown
        </p>
      </div>
    );
  }

  const enriched = data.map((d) => ({
    ...d,
    displayLabel: labelFor(dimension, d),
  }));

  return (
    <div className="h-72 rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">
        {dimensionTitle(dimension)}
      </h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart
          data={enriched}
          layout="vertical"
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            tickFormatter={(value: number) =>
              formatMoneyCompact(value, currency)
            }
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="displayLabel"
            tick={{ fontSize: 11 }}
            width={120}
          />
          <Tooltip
            formatter={
              ((value: number) => formatMoney(value, currency)) as never
            }
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
          />
          <Bar dataKey="gross" name="Gross" radius={[0, 4, 4, 0]}>
            {enriched.map((_, idx) => (
              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
