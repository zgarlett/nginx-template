import { useGet } from '../hooks/Api';
import { backendApiBaseUrl } from '../constants';
import './FinanceMetricsPage.css';

type MetricRow = Record<string, unknown>;

type FinanceMetricsResponse = {
  metrics: Record<string, MetricRow[]>;
  unavailable: Record<string, string>;
};

const metricLabels: Record<string, string> = {
  dailyBalance: 'Daily balance',
  monthlySpending: 'Monthly spending',
  monthlySpendingComparison: 'Month-over-month spending',
  yearlySpendingComparison: 'Year-over-year spending',
  spendingByCategory: 'Spending by category',
  monthlyCashFlow: 'Monthly cash flow',
  largestPurchases: 'Largest purchases',
  spendingByWeekday: 'Spending by weekday',
  monthlySpendingByCategory: 'Monthly spending by category',
  averageMonthlySpending: 'Average monthly spending',
  recurringTransactions: 'Recurring transaction candidates',
  spendingConcentration: 'Spending concentration',
  budgetVsActual: 'Budget vs. actual',
  yearToDateSpending: 'Year-to-date spending',
};

const currencyFields = new Set([
  'daily_net_change',
  'cumulative_net_change',
  'total_spending',
  'spending',
  'previous_month',
  'previous_year',
  'change_amount',
  'average_purchase',
  'money_in',
  'money_out',
  'net_cash_flow',
  'purchase_amount',
  'average_monthly_spending',
  'average_amount',
  'budget_amount',
  'actual_spending',
  'remaining_budget',
  'year_to_date_spending',
]);

function formatValue(value: unknown, field: string): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    if (field === 'change_percent' || field === 'percentage_of_total') return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
    if (currencyFields.has(field)) {
      return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
    }
    return value.toLocaleString();
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString();
  }
  return String(value);
}

function MetricTable({ rows }: { rows: MetricRow[] }) {
  if (rows.length === 0) {
    return <p className="finance-metric-empty">No data available yet.</p>;
  }

  const columns = Object.keys(rows[0]);
  return (
    <div className="finance-metric-table-scroll">
      <table className="finance-metric-table">
        <thead>
          <tr>{columns.map((column) => <th key={column} scope="col">{column.replace(/_/g, ' ')}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => <td key={column}>{formatValue(row[column], column)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const FinanceMetricsPage = () => {
  const { data, error, loading } = useGet<FinanceMetricsResponse>(
    `${backendApiBaseUrl}statements/metrics`,
  );
  const metrics = data?.metrics;
  const yearToDate = metrics?.yearToDateSpending?.[0]?.year_to_date_spending;
  const averageMonthly = metrics?.averageMonthlySpending?.[0]?.average_monthly_spending;
  const dailyRows = metrics?.dailyBalance ?? [];
  const latestBalance = dailyRows.at(-1)?.cumulative_net_change;

  return (
    <main className="finance-metrics-page">
      <header className="finance-metrics-heading">
        <p className="finance-metrics-eyebrow">PERSONAL FINANCE <span>/</span> OVERVIEW</p>
        <h1>Finance metrics</h1>
        <p>Spending, cash flow, and transaction trends from your imported statements.</p>
      </header>

      {loading && <p className="finance-metrics-message" role="status">Loading finance metrics…</p>}
      {error && <p className="finance-metrics-error" role="alert">{error.message}</p>}
      {!loading && !error && data && (
        <>
          <section className="finance-summary-grid" aria-label="Key finance metrics">
            <article className="finance-summary-card finance-summary-primary">
              <span>Year-to-date spending</span>
              <strong>{formatValue(yearToDate, 'year_to_date_spending')}</strong>
              <small>Current calendar year</small>
            </article>
            <article className="finance-summary-card">
              <span>Average monthly spending</span>
              <strong>{formatValue(averageMonthly, 'average_monthly_spending')}</strong>
              <small>Average of months with transactions</small>
            </article>
            <article className="finance-summary-card">
              <span>Cumulative net change</span>
              <strong>{formatValue(latestBalance, 'cumulative_net_change')}</strong>
              <small>{dailyRows.length.toLocaleString()} transaction days</small>
            </article>
          </section>

          <div className="finance-metric-sections">
            {Object.entries(metricLabels).map(([key, label]) => (
              <section className="finance-metric-section" key={key}>
                <header>
                  <h2>{label}</h2>
                  {data.unavailable[key] && <span className="finance-metric-note">{data.unavailable[key]}</span>}
                </header>
                <MetricTable rows={metrics?.[key] ?? []} />
              </section>
            ))}
          </div>
        </>
      )}
    </main>
  );
};

export default FinanceMetricsPage;
