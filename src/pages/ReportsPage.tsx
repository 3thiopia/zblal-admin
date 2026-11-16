import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { ViewModeToggle } from '../components/ui/ViewModeToggle';
import { useResponsiveViewMode } from '../hooks/useResponsiveViewMode';
import { downloadCsv, formatETB } from '../utils/formatters';

const PRIORITY_COLORS = ['#123C2A', '#D97706', '#B91C1C', '#4B5563'];

export function ReportsPage() {
  const { requests, operators, addToast } = useApp();
  const [viewMode, setViewMode] = useResponsiveViewMode('reports');

  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('week');
  const [dateRange, setDateRange] = useState<'30d' | '90d' | 'all'>('90d');

  const rangedRequests = useMemo(() => {
    if (dateRange === 'all') return requests;
    const days = dateRange === '30d' ? 30 : 90;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return requests.filter((r) => {
      const t = new Date(r.submittedAt).getTime();
      return Number.isNaN(t) ? true : t >= cutoff;
    });
  }, [requests, dateRange]);

  const requestSeries = useMemo(() => {
    const map = new Map<
      string,
      { sortKey: string; period: string; requests: number; completed: number; cancelled: number }
    >();

    rangedRequests.forEach((r) => {
      const dt = new Date(r.submittedAt);
      if (Number.isNaN(dt.getTime())) return;

      let sortKey: string;
      let period: string;
      if (granularity === 'day') {
        sortKey = dt.toISOString().slice(0, 10);
        period = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (granularity === 'week') {
        const weekStart = new Date(dt);
        weekStart.setDate(dt.getDate() - dt.getDay());
        sortKey = weekStart.toISOString().slice(0, 10);
        period = `Wk ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      } else {
        sortKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        period = dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }

      const row = map.get(sortKey) ?? {
        sortKey,
        period,
        requests: 0,
        completed: 0,
        cancelled: 0,
      };
      row.requests += 1;
      if (r.status === 'Completed') row.completed += 1;
      if (r.status === 'Cancelled') row.cancelled += 1;
      map.set(sortKey, row);
    });

    return Array.from(map.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [rangedRequests, granularity]);

  const revenueSeries = useMemo(() => {
    const map = new Map<
      string,
      { sortKey: string; month: string; completedRevenue: number; totalRevenue: number }
    >();

    rangedRequests.forEach((r) => {
      if (r.status === 'Cancelled') return;
      const dt = new Date(r.submittedAt);
      if (Number.isNaN(dt.getTime())) return;
      const sortKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const month = dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const row = map.get(sortKey) ?? {
        sortKey,
        month,
        completedRevenue: 0,
        totalRevenue: 0,
      };
      row.totalRevenue += r.priceEtb;
      if (r.status === 'Completed') row.completedRevenue += r.priceEtb;
      map.set(sortKey, row);
    });

    return Array.from(map.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [rangedRequests]);

  const priorityData = useMemo(() => {
    const counts = new Map<string, number>();
    rangedRequests.forEach((r) => {
      const key = String(r.priority || 'Standard');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [rangedRequests]);

  const subcityActivity = useMemo(() => {
    const map = new Map<string, number>();
    rangedRequests.forEach((r) => {
      map.set(r.subcityName, (map.get(r.subcityName) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([subcity, count]) => ({ subcity, count }))
      .sort((a, b) => b.count - a.count);
  }, [rangedRequests]);

  const topOperators = useMemo(() => {
    return [...operators]
      .sort((a, b) => b.completedJobsCount - a.completedJobsCount)
      .slice(0, 6);
  }, [operators]);

  const completedCount = rangedRequests.filter((r) => r.status === 'Completed').length;
  const cancelledCount = rangedRequests.filter((r) => r.status === 'Cancelled').length;

  const handleExportCsv = () => {
    downloadCsv(
      `zblal-operations-report-${granularity}.csv`,
      ['Period', 'Requests', 'Completed', 'Cancelled'],
      requestSeries.map((r) => [r.period, r.requests, r.completed, r.cancelled])
    );
    addToast('Report CSV exported', `Downloaded ${requestSeries.length} ${granularity}ly periods.`, 'info');
  };

  return (
    <div className="space-y-5 sm:space-y-6 min-w-0">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[#202A24]">Operations & Performance Reports</h2>
          <p className="text-xs text-[#758078] mt-0.5">
            Live operational analytics computed from Supabase service_requests, service_assignments, and vehicle_operators.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="grid grid-cols-3 sm:inline-flex items-center p-1 bg-white border border-[#E6EAE5] rounded-lg w-full sm:w-auto">
            {(['day', 'week', 'month'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGranularity(g)}
                className={`min-h-[40px] sm:min-h-[30px] px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                  granularity === g
                    ? 'bg-[#123C2A] text-white'
                    : 'text-[#758078] hover:text-[#202A24]'
                }`}
              >
                By {g}
              </button>
            ))}
          </div>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '30d' | '90d' | 'all')}
            aria-label="Report date window"
            className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[38px] px-3 py-2 text-xs bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
          >
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All records</option>
          </select>

          <button
            type="button"
            disabled={requestSeries.length === 0}
            onClick={handleExportCsv}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-3.5 py-2 text-xs font-medium text-[#123C2A] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0] disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary metrics strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E6EAE5] rounded-xl p-4">
          <p className="text-xs text-[#758078]">Completed Services</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-[#123C2A] mt-1.5">
            {completedCount}
          </p>
        </div>
        <div className="bg-white border border-[#E6EAE5] rounded-xl p-4">
          <p className="text-xs text-[#758078]">Cancelled Services</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-[#202A24] mt-1.5">
            {cancelledCount}
          </p>
        </div>
        <div className="bg-white border border-[#E6EAE5] rounded-xl p-4">
          <p className="text-xs text-[#758078]">Active Subcity Hubs</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-[#202A24] mt-1.5">
            {subcityActivity.length}
          </p>
        </div>
        <div className="bg-white border border-[#E6EAE5] rounded-xl p-4">
          <p className="text-xs text-[#758078]">Top Operator Jobs</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-[#202A24] mt-1.5">
            {topOperators[0]?.completedJobsCount ?? 0}
          </p>
        </div>
      </section>

      {/* Charts grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Requests, Completed & Cancelled */}
        <div className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5 min-w-0">
          <h3 className="text-sm font-semibold text-[#202A24] mb-1">
            Service Requests, Completed & Cancelled ({granularity})
          </h3>
          <p className="text-xs text-[#758078] mb-4">Window: {dateRange.toUpperCase()}</p>
          {requestSeries.length === 0 ? (
            <div className="h-56 sm:h-64 flex items-center justify-center text-xs text-[#758078] bg-[#F7F6F0]/60 rounded-lg border border-dashed border-[#E6EAE5]">
              No requests found in selected time window.
            </div>
          ) : (
            <div className="h-56 sm:h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={requestSeries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6EAE5" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#758078' }} axisLine={false} tickLine={false} />
                  <YAxis width={36} tick={{ fontSize: 11, fill: '#758078' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E6EAE5',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="requests" name="Total Requests" fill="#DCE8DF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#123C2A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancelled" name="Cancelled" fill="#B91C1C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Revenue Trends */}
        <div className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5 min-w-0">
          <h3 className="text-sm font-semibold text-[#202A24] mb-1">Service Order Value Trend (ETB)</h3>
          <p className="text-xs text-[#758078] mb-4">Total booked vs completed service orders</p>
          {revenueSeries.length === 0 ? (
            <div className="h-56 sm:h-64 flex items-center justify-center text-xs text-[#758078] bg-[#F7F6F0]/60 rounded-lg border border-dashed border-[#E6EAE5]">
              No order value data in selected window.
            </div>
          ) : (
            <div className="h-56 sm:h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueSeries} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
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
                    formatter={(v) => formatETB(Number(v ?? 0))}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E6EAE5',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="totalRevenue" name="Total Order Value" stroke="#758078" strokeWidth={2} />
                  <Line type="monotone" dataKey="completedRevenue" name="Completed Orders" stroke="#123C2A" strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Priority Distribution */}
        <div className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5 min-w-0">
          <h3 className="text-sm font-semibold text-[#202A24] mb-1">Priority Distribution</h3>
          <p className="text-xs text-[#758078] mb-4">Breakdown of Supabase service requests</p>
          {priorityData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-[#758078] bg-[#F7F6F0]/60 rounded-lg border border-dashed border-[#E6EAE5]">
              No priority breakdown available.
            </div>
          ) : (
            <div className="w-full flex flex-col sm:flex-row items-center gap-4 min-h-[240px]">
              <div className="w-full sm:w-1/2 h-48 sm:h-52 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={72}
                      paddingAngle={2}
                    >
                      {priorityData.map((entry, idx) => (
                        <Cell key={entry.name} fill={PRIORITY_COLORS[idx % PRIORITY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/2 space-y-2.5 text-xs">
                {priorityData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between py-1.5 border-b border-[#E6EAE5]">
                    <span className="flex items-center gap-2 font-medium text-[#202A24]">
                      <span
                        className="w-2.5 h-2.5 rounded-sm inline-block shrink-0"
                        style={{ backgroundColor: PRIORITY_COLORS[idx % PRIORITY_COLORS.length] }}
                      />
                      {item.name}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-[#202A24]">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Operating Area Activity */}
        <div className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5 min-w-0">
          <h3 className="text-sm font-semibold text-[#202A24] mb-1">Operating Area Activity</h3>
          <p className="text-xs text-[#758078] mb-4">Request volume by subcity</p>
          {subcityActivity.length === 0 ? (
            <div className="h-56 sm:h-60 flex items-center justify-center text-xs text-[#758078] bg-[#F7F6F0]/60 rounded-lg border border-dashed border-[#E6EAE5]">
              No subcity activity recorded in this window.
            </div>
          ) : (
            <div className="h-56 sm:h-60 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={subcityActivity}
                  margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6EAE5" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#758078' }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="subcity"
                    width={84}
                    tick={{ fontSize: 11, fill: '#202A24' }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" name="Requests" fill="#123C2A" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* Operator Performance Summary */}
      <section className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-[#E6EAE5] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#202A24]">Operator Performance Summary</h3>
            <p className="text-xs text-[#758078]">Ranked by completed service assignments</p>
          </div>
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>
        {topOperators.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#758078]">
            No vehicle operators registered in Supabase yet.
          </div>
        ) : viewMode === 'cards' ? (
          <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {topOperators.map((op) => (
              <article
                key={op.id}
                className="p-3.5 bg-[#F7F6F0]/45 border border-[#E6EAE5] rounded-xl space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#202A24] truncate">{op.fullName}</p>
                    <p className="text-xs text-[#758078] truncate">
                      {op.subcityName} · {op.neighbourhoodName}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] font-medium px-2 py-0.5 bg-white border border-[#E6EAE5] rounded text-[#758078] shrink-0">
                    {op.vehiclePlate || '—'}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E6EAE5] text-xs">
                  <div>
                    <dt className="text-[11px] text-[#758078]">Completed Jobs</dt>
                    <dd className="font-mono font-semibold tabular-nums text-[#202A24] mt-0.5">
                      {op.completedJobsCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-[#758078]">Completed Value</dt>
                    <dd className="font-mono font-semibold tabular-nums text-[#123C2A] mt-0.5">
                      {formatETB(op.totalEarningsEtb)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E6EAE5] bg-[#F7F6F0]/70 text-[11px] font-semibold text-[#758078] uppercase">
                  <th className="py-2.5 px-4">Operator</th>
                  <th className="py-2.5 px-4">Plate</th>
                  <th className="py-2.5 px-4">Primary Area</th>
                  <th className="py-2.5 px-4 text-right">Completed Jobs</th>
                  <th className="py-2.5 px-4 text-right">Completed Order Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAE5]">
                {topOperators.map((op) => (
                  <tr key={op.id} className="hover:bg-[#F7F6F0]/50">
                    <td className="py-3 px-4 font-medium text-[#202A24]">{op.fullName}</td>
                    <td className="py-3 px-4 font-mono text-[#758078]">{op.vehiclePlate || '—'}</td>
                    <td className="py-3 px-4 text-[#202A24]">
                      {op.subcityName} · {op.neighbourhoodName}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#202A24]">
                      {op.completedJobsCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#123C2A] font-medium">
                      {formatETB(op.totalEarningsEtb)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
