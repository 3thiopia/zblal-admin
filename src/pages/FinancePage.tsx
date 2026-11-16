import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { ViewModeToggle } from '../components/ui/ViewModeToggle';
import { useResponsiveViewMode } from '../hooks/useResponsiveViewMode';
import { downloadCsv, formatDateTime, formatETB } from '../utils/formatters';
import { PaymentStatus, Transaction } from '../types';

const PAGE_SIZE = 7;

export function FinancePage() {
  const { transactions, requests, addToast } = useApp();
  const [viewMode, setViewMode] = useResponsiveViewMode('finance');

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const summary = useMemo(() => {
    const completedRevenue = transactions
      .filter((t) => t.status === 'Paid')
      .reduce((s, t) => s + t.amountEtb, 0);

    const pendingRevenue = transactions
      .filter((t) => t.status === 'Pending' || t.status === 'Overdue')
      .reduce((s, t) => s + t.amountEtb, 0);

    const totalOrderValue = completedRevenue + pendingRevenue;
    const completedCount = requests.filter((r) => r.status === 'Completed').length;
    const activeCount = requests.filter(
      (r) => r.status !== 'Completed' && r.status !== 'Cancelled'
    ).length;
    const averageOrderValue =
      transactions.length > 0 ? Math.round(totalOrderValue / transactions.length) : 0;

    return {
      totalOrderValue,
      completedRevenue,
      pendingRevenue,
      completedCount,
      activeCount,
      averageOrderValue,
    };
  }, [transactions, requests]);

  const monthlySeries = useMemo(() => {
    const map = new Map<
      string,
      { sortKey: string; month: string; completedRevenue: number; pendingRevenue: number }
    >();

    transactions.forEach((tx) => {
      const dt = new Date(tx.date);
      if (Number.isNaN(dt.getTime())) return;
      const sortKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const month = dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const row = map.get(sortKey) ?? {
        sortKey,
        month,
        completedRevenue: 0,
        pendingRevenue: 0,
      };
      if (tx.status === 'Paid') {
        row.completedRevenue += tx.amountEtb;
      } else {
        row.pendingRevenue += tx.amountEtb;
      }
      map.set(sortKey, row);
    });

    return Array.from(map.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (statusFilter && tx.status !== (statusFilter as PaymentStatus)) return false;
      const txDay = tx.date.slice(0, 10);
      if (dateFrom && txDay < dateFrom) return false;
      if (dateTo && txDay > dateTo) return false;
      return true;
    });
  }, [transactions, statusFilter, dateFrom, dateTo]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const handleExportCsv = () => {
    downloadCsv(
      'zblal-service-order-ledger.csv',
      ['Reference', 'Date', 'Priority Tier', 'Customer', 'Description', 'Amount (ETB)', 'Status'],
      filtered.map((t) => [
        t.reference,
        t.date.slice(0, 10),
        t.category,
        t.relatedCustomerName ?? '',
        t.description,
        t.amountEtb,
        t.status,
      ])
    );
    addToast('Ledger CSV exported', `${filtered.length} service order rows downloaded.`, 'info');
  };

  const kpis = [
    { label: 'Total Service Order Value', value: formatETB(summary.totalOrderValue) },
    { label: 'Completed Orders Value', value: formatETB(summary.completedRevenue) },
    { label: 'Active / Pending Value', value: formatETB(summary.pendingRevenue) },
    { label: 'Average Priority Fee', value: formatETB(summary.averageOrderValue) },
    { label: 'Completed Service Orders', value: String(summary.completedCount) },
    { label: 'Open Service Orders', value: String(summary.activeCount) },
  ];

  const matchingRequestId = selectedTx
    ? requests.find((r) => r.referenceNumber === selectedTx.relatedRequestRef)?.id
    : undefined;

  return (
    <div className="space-y-5 sm:space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[#202A24]">Finance & Service Order Revenue</h2>
          <p className="text-xs text-[#758078] mt-0.5">
            Derived strictly from real Supabase service_requests and service_priorities records in Ethiopian Birr (ETB).
          </p>
        </div>

        <button
          type="button"
          disabled={filtered.length === 0}
          onClick={handleExportCsv}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs font-medium text-[#123C2A] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0] whitespace-nowrap shrink-0 disabled:opacity-50 w-full sm:w-auto"
        >
          <Download className="w-3.5 h-3.5" />
          Export Ledger CSV
        </button>
      </div>

      {/* 6 KPI cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {kpis.map((item) => (
          <div key={item.label} className="bg-white border border-[#E6EAE5] rounded-xl p-4">
            <p className="text-xs font-medium text-[#758078]">{item.label}</p>
            <p className="text-xl font-semibold font-mono tabular-nums text-[#202A24] mt-2">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      {/* Financial chart */}
      <section className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5 min-w-0">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[#202A24]">
            Monthly Completed vs Pending Service Value (ETB)
          </h3>
          <p className="text-xs text-[#758078]">Aggregated from service_requests and service_priorities</p>
        </div>
        {monthlySeries.length === 0 ? (
          <div className="h-56 sm:h-64 flex items-center justify-center text-xs text-[#758078] bg-[#F7F6F0]/60 rounded-lg border border-dashed border-[#E6EAE5]">
            No priced service orders recorded in Supabase yet.
          </div>
        ) : (
          <div className="h-56 sm:h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySeries} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6EAE5" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#758078' }} axisLine={false} tickLine={false} />
                <YAxis
                  width={42}
                  tick={{ fontSize: 11, fill: '#758078' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  formatter={(value) => formatETB(Number(value ?? 0))}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E6EAE5',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="completedRevenue" name="Completed Orders" fill="#123C2A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pendingRevenue" name="Open / Pending Orders" fill="#88A994" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Filters + Service Orders Ledger */}
      <section className="space-y-3 sm:space-y-4">
        <div className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E6EAE5] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#202A24]">Service Order Ledger</h3>
              <p className="text-[11px] text-[#758078]">{filtered.length} matching order(s)</p>
            </div>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>

          <div className="p-3 sm:p-4 border-b border-[#E6EAE5] grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by order completion status"
              className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            >
              <option value="">All order statuses</option>
              <option value="Paid">Completed (Paid)</option>
              <option value="Pending">Open (Pending)</option>
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              aria-label="From date"
              className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              aria-label="To date"
              className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No service order ledger entries"
                description="Service order revenue rows are populated automatically from Supabase service_requests."
              />
            </div>
          ) : viewMode === 'cards' ? (
            <>
              <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {paginated.map((tx) => {
                  const isExpanded = Boolean(expandedCards[tx.id]);
                  return (
                    <article
                      key={tx.id}
                      className="p-3.5 bg-[#F7F6F0]/45 border border-[#E6EAE5] rounded-xl flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-semibold text-[#123C2A] truncate">
                              {tx.reference}
                            </p>
                            <p className="text-[11px] font-mono text-[#758078] mt-0.5">
                              {tx.date.slice(0, 10)}
                            </p>
                          </div>
                          <StatusBadge status={tx.status} />
                        </div>

                        <div className="flex items-baseline justify-between gap-2 pt-1">
                          <span className="text-sm font-medium text-[#202A24] truncate">
                            {tx.relatedCustomerName ?? '—'}
                          </span>
                          <span className="font-mono text-sm font-semibold tabular-nums text-[#123C2A] shrink-0">
                            {formatETB(tx.amountEtb)}
                          </span>
                        </div>

                        {isExpanded && (
                          <dl className="pt-2 border-t border-[#E6EAE5] space-y-1.5 text-xs">
                            <div className="flex justify-between gap-2">
                              <dt className="text-[#758078]">Priority Tier</dt>
                              <dd className="font-medium text-[#202A24]">{tx.category}</dd>
                            </div>
                            <div>
                              <dt className="text-[#758078]">Service Area</dt>
                              <dd className="text-[#202A24] mt-0.5 break-words">{tx.description}</dd>
                            </div>
                          </dl>
                        )}
                      </div>

                      <div className="pt-2 border-t border-[#E6EAE5] flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCards((prev) => ({ ...prev, [tx.id]: !prev[tx.id] }))
                          }
                          className="inline-flex items-center justify-center gap-1 min-h-[44px] sm:min-h-[34px] px-3 py-1.5 text-xs font-medium text-[#758078] bg-white border border-[#E6EAE5] rounded-lg"
                        >
                          <span>{isExpanded ? 'Less' : 'Details'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedTx(tx)}
                          className="flex-1 inline-flex items-center justify-center min-h-[44px] sm:min-h-[34px] px-3 py-1.5 text-xs font-medium text-[#123C2A] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#DCE8DF]"
                        >
                          Inspect
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="px-4 pb-4">
                <Pagination
                  currentPage={page}
                  totalItems={filtered.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                />
              </div>
            </>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E6EAE5] bg-[#F7F6F0]/70 text-[11px] font-semibold text-[#758078] uppercase tracking-wider">
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Priority Tier</th>
                      <th className="py-3 px-4">Area</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6EAE5] text-xs">
                    {paginated.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#F7F6F0]/50">
                        <td className="py-3 px-4 font-mono font-medium text-[#202A24] whitespace-nowrap">
                          {tx.reference}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#758078] whitespace-nowrap">
                          {tx.date.slice(0, 10)}
                        </td>
                        <td className="py-3 px-4 text-[#202A24] whitespace-nowrap">
                          {tx.relatedCustomerName ?? '—'}
                        </td>
                        <td className="py-3 px-4 text-[#202A24] whitespace-nowrap">{tx.category}</td>
                        <td className="py-3 px-4 text-[#758078] max-w-xs truncate">{tx.description}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-[#202A24] whitespace-nowrap">
                          {formatETB(tx.amountEtb)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={tx.status} />
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedTx(tx)}
                            className="px-2.5 py-1 text-xs font-medium text-[#123C2A] bg-[#F7F6F0] border border-[#E6EAE5] rounded-md hover:bg-[#DCE8DF]"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 pb-4">
                <Pagination
                  currentPage={page}
                  totalItems={filtered.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Order Financial Detail Modal */}
      <Modal
        open={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        title={selectedTx ? `Service Order ${selectedTx.reference}` : 'Order Details'}
        size="md"
        footer={
          selectedTx && (
            <>
              {matchingRequestId && (
                <Link
                  to={`/requests/${matchingRequestId}`}
                  onClick={() => setSelectedTx(null)}
                  className="inline-flex items-center justify-center min-h-[44px] sm:min-h-[38px] w-full sm:w-auto px-4 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21]"
                >
                  Open Service Request
                </Link>
              )}
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 text-xs font-medium text-[#202A24] bg-white border border-[#E6EAE5] rounded-lg"
              >
                Close
              </button>
            </>
          )
        }
      >
        {selectedTx && (
          <dl className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[#E6EAE5]">
              <dt className="text-[#758078]">Order Status</dt>
              <dd>
                <StatusBadge status={selectedTx.status} />
              </dd>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#E6EAE5]">
              <dt className="text-[#758078]">Priority Fee</dt>
              <dd className="font-mono font-semibold text-[#123C2A]">{formatETB(selectedTx.amountEtb)}</dd>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#E6EAE5]">
              <dt className="text-[#758078]">Priority Tier</dt>
              <dd className="text-[#202A24]">{selectedTx.category}</dd>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#E6EAE5]">
              <dt className="text-[#758078]">Customer</dt>
              <dd className="text-[#202A24]">{selectedTx.relatedCustomerName ?? '—'}</dd>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#E6EAE5]">
              <dt className="text-[#758078]">Submitted</dt>
              <dd className="font-mono text-[#202A24]">{formatDateTime(selectedTx.date)}</dd>
            </div>
            <div className="pt-1">
              <dt className="text-[#758078] mb-1">Service Area</dt>
              <dd className="text-[#202A24]">{selectedTx.description}</dd>
            </div>
          </dl>
        )}
      </Modal>
    </div>
  );
}
