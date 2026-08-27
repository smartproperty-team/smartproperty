// ===========================================
// SmartProperty - Accountant Dashboard Page
// ===========================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator, RefreshCw } from 'lucide-react';
import { AppSidebar } from '../../components/layout';
import { Alert, Card, CardContent } from '../../components/ui';
import { BreakdownBarChart } from '../../components/accounting/BreakdownBarChart';
import { DateRangePicker } from '../../components/accounting/DateRangePicker';
import { ExportPanel } from '../../components/accounting/ExportPanel';
import { IncomeLineChart } from '../../components/accounting/IncomeLineChart';
import { KpiCards } from '../../components/accounting/KpiCards';
import { accountingService } from '../../services/accounting.service';
import {
  AnalyticsGranularity,
  BreakdownDimension,
  type BreakdownEntry,
  type KpisResponse,
  type TimeseriesBucket,
} from '../../types/accounting';
import { startOfYear, today } from '../../utils/money';

export default function AccountingDashboardPage() {
  const navigate = useNavigate();

  // Date range + granularity
  const [startDate, setStartDate] = useState<string>(startOfYear());
  const [endDate, setEndDate] = useState<string>(today());
  const [granularity, setGranularity] = useState<AnalyticsGranularity>(
    AnalyticsGranularity.MONTH,
  );
  const [breakdownDim, setBreakdownDim] = useState<BreakdownDimension>(
    BreakdownDimension.METHOD,
  );

  // Data
  const [kpis, setKpis] = useState<KpisResponse | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesBucket[]>([]);
  const [breakdown, setBreakdown] = useState<BreakdownEntry[]>([]);

  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingTimeseries, setLoadingTimeseries] = useState(true);
  const [loadingBreakdown, setLoadingBreakdown] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () => ({ startDate, endDate }),
    [startDate, endDate],
  );

  const fetchAll = useCallback(async () => {
    setError(null);
    setLoadingKpis(true);
    setLoadingTimeseries(true);
    setLoadingBreakdown(true);
    try {
      const [k, t, b] = await Promise.all([
        accountingService.getKpis(query),
        accountingService.getTimeseries({ ...query, granularity }),
        accountingService.getBreakdown({
          ...query,
          dimension: breakdownDim,
          topN: 10,
        }),
      ]);
      setKpis(k);
      setTimeseries(t);
      setBreakdown(b);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string });
      setError(
        msg.response?.data?.message ||
          msg.message ||
          'Failed to load accounting data.',
      );
    } finally {
      setLoadingKpis(false);
      setLoadingTimeseries(false);
      setLoadingBreakdown(false);
    }
  }, [query, granularity, breakdownDim]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const currency = kpis?.currency || 'EUR';

  const periodLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    try {
      return `${formatter.format(new Date(startDate))} → ${formatter.format(new Date(endDate))}`;
    } catch {
      return `${startDate} → ${endDate}`;
    }
  }, [startDate, endDate]);

  return (
    <div className="min-h-screen bg-gray-50 pt-16 lg:pt-[72px]">
      <AppSidebar />

      <header className="sticky top-16 z-40 border-b border-gray-200 bg-white shadow-md lg:top-[72px]">
        <div className="mx-auto flex h-20 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 sm:flex"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden md:inline">Dashboard</span>
          </button>
          <div className="hidden h-8 w-px bg-gray-200 sm:block" />

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
              <Calculator className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold leading-tight text-gray-900">
                Accounting
              </h1>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-gray-500">
                <span className="hidden md:inline">Reporting period:</span>
                <span className="font-medium text-gray-700">{periodLabel}</span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {kpis && kpis.count > 0 && (
              <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100 md:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {kpis.count.toLocaleString()} payment
                {kpis.count === 1 ? '' : 's'}
              </span>
            )}
            <button
              type="button"
              onClick={() => void fetchAll()}
              disabled={loadingKpis}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Refresh data"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loadingKpis ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <Alert type="error" message={error} onClose={() => setError(null)} />
        )}

        {/* Date range + granularity */}
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          granularity={granularity}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onGranularityChange={setGranularity}
        />

        {/* KPIs */}
        <KpiCards kpis={kpis} loading={loadingKpis} />

        {/* Per-currency breakdown if mixed */}
        {kpis?.byCurrency && kpis.byCurrency.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                Per-currency totals
              </h3>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">
                        Currency
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700">
                        Gross
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700">
                        Net
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-700">
                        Count
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {kpis.byCurrency.map((row) => (
                      <tr key={row.currency}>
                        <td className="px-3 py-1.5 font-medium text-gray-900">
                          {row.currency}
                        </td>
                        <td className="px-3 py-1.5 text-right text-gray-900">
                          {row.gross.toLocaleString()}
                        </td>
                        <td className="px-3 py-1.5 text-right text-gray-900">
                          {row.net.toLocaleString()}
                        </td>
                        <td className="px-3 py-1.5 text-right text-gray-900">
                          {row.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Time series */}
        <IncomeLineChart
          data={timeseries}
          currency={currency}
          loading={loadingTimeseries}
        />

        {/* Breakdown */}
        <div>
          <div className="mb-2 flex items-center gap-2 overflow-x-auto">
            <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-gray-500">
              Breakdown by
            </span>
            {(
              [
                { label: 'Method', value: BreakdownDimension.METHOD },
                { label: 'Type', value: BreakdownDimension.TYPE },
                { label: 'Property', value: BreakdownDimension.PROPERTY },
                { label: 'Tenant', value: BreakdownDimension.TENANT },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setBreakdownDim(opt.value)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  breakdownDim === opt.value
                    ? 'bg-indigo-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <BreakdownBarChart
            data={breakdown}
            dimension={breakdownDim}
            currency={currency}
            loading={loadingBreakdown}
          />
        </div>

        {/* Exports */}
        <ExportPanel startDate={startDate} endDate={endDate} />
      </main>
    </div>
  );
}
