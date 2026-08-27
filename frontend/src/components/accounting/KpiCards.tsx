// ===========================================
// SmartProperty - Accounting KPI Cards
// ===========================================

import {
  AlertTriangle,
  Banknote,
  CreditCard,
  PiggyBank,
  Receipt,
  TrendingUp,
} from 'lucide-react';
import type { KpisResponse } from '../../types/accounting';
import { formatMoney } from '../../utils/money';

interface KpiCardsProps {
  kpis: KpisResponse | null;
  loading?: boolean;
}

interface CardData {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'green' | 'blue' | 'amber' | 'red' | 'indigo' | 'gray';
}

const TONES: Record<
  CardData['tone'],
  { bg: string; iconBg: string; text: string }
> = {
  green: {
    bg: 'border-emerald-200 bg-emerald-50/60',
    iconBg: 'bg-emerald-100 text-emerald-700',
    text: 'text-emerald-900',
  },
  blue: {
    bg: 'border-blue-200 bg-blue-50/60',
    iconBg: 'bg-blue-100 text-blue-700',
    text: 'text-blue-900',
  },
  amber: {
    bg: 'border-amber-200 bg-amber-50/60',
    iconBg: 'bg-amber-100 text-amber-700',
    text: 'text-amber-900',
  },
  red: {
    bg: 'border-red-200 bg-red-50/60',
    iconBg: 'bg-red-100 text-red-700',
    text: 'text-red-900',
  },
  indigo: {
    bg: 'border-indigo-200 bg-indigo-50/60',
    iconBg: 'bg-indigo-100 text-indigo-700',
    text: 'text-indigo-900',
  },
  gray: {
    bg: 'border-gray-200 bg-gray-50/60',
    iconBg: 'bg-gray-100 text-gray-700',
    text: 'text-gray-900',
  },
};

export function KpiCards({ kpis, loading = false }: KpiCardsProps) {
  if (loading || !kpis) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-100/50"
          />
        ))}
      </div>
    );
  }

  const currency = kpis.currency || 'EUR';
  const cards: CardData[] = [
    {
      label: 'Gross income',
      value: formatMoney(kpis.gross, currency),
      hint:
        currency === 'MIXED' ? 'Multiple currencies' : `Across ${kpis.count} payments`,
      icon: TrendingUp,
      tone: 'green',
    },
    {
      label: 'Net income',
      value: formatMoney(kpis.net, currency),
      hint: 'After fees & refunds',
      icon: PiggyBank,
      tone: 'blue',
    },
    {
      label: 'Processing fees',
      value: formatMoney(kpis.fees, currency),
      hint: 'Stripe + gateway fees',
      icon: CreditCard,
      tone: 'gray',
    },
    {
      label: 'Refunds',
      value: formatMoney(kpis.refunds, currency),
      hint: 'Total refunded',
      icon: Receipt,
      tone: 'amber',
    },
    {
      label: 'Failure rate',
      value: `${(kpis.failureRate * 100).toFixed(1)}%`,
      hint: `${kpis.failedCount} failed of ${kpis.completedCount + kpis.failedCount}`,
      icon: AlertTriangle,
      tone: kpis.failureRate > 0.1 ? 'red' : 'gray',
    },
    {
      label: 'Avg. payment',
      value: formatMoney(kpis.avgPayment, currency),
      hint: 'Completed payments only',
      icon: Banknote,
      tone: 'indigo',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => {
        const t = TONES[card.tone];
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`rounded-xl border p-4 ${t.bg}`}
          >
            <div className={`mb-2 inline-flex rounded-lg p-1.5 ${t.iconBg}`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-xs font-medium text-gray-600">{card.label}</p>
            <p className={`mt-0.5 text-lg font-bold ${t.text}`}>
              {card.value}
            </p>
            {card.hint && (
              <p className="mt-1 text-[11px] text-gray-500">{card.hint}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
