import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus,
  Bell,
  ArrowRight,
  Phone,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatDate, formatETB, formatLitres, formatTimeAgo, isCallablePhone, toTelHref } from '../utils/formatters';
import { OperatorStatus } from '../types';

const OPERATOR_STATUS_ORDER: OperatorStatus[] = [
  'Available',
  'Assigned',
  'Busy',
  'Unavailable',
  'Suspended',
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DashboardPage() {
  const {
    operators,
    requests,
    notifications,
    activityFeed,
    settings,
    setRegisterModalOpen,
  } = useApp();

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const totalRequests = requests.length;
  const pendingRequests = requests.filter(
    (r) =>
      r.status === 'Pending' ||
      r.status === 'Operator Selected' ||
      r.status === 'Operator Contacted'
  ).length;
  const activeJobs = requests.filter(
    (r) => r.status === 'Assigned' || r.status === 'In Progress'
  ).length;
  const completedJobs = requests.filter((r) => r.status === 'Completed').length;
  const registeredOperators = operators.length;
  const availableVehicles = operators.filter((o) => o.availability === 'Available').length;

  const stats = [
    { label: 'Total Requests', value: totalRequests, sub: 'All Supabase records', to: '/requests' },
    { label: 'Pending Requests', value: pendingRequests, sub: 'Awaiting dispatch', to: '/requests?status=pending' },
    { label: 'Active Jobs', value: activeJobs, sub: 'Assigned or in progress', to: '/requests?status=active' },
    { label: 'Completed Jobs', value: completedJobs, sub: 'Signed off', to: '/requests?status=Completed' },
    { label: 'Registered Operators', value: registeredOperators, sub: '1 truck per operator', to: '/operators' },
    { label: 'Available Vehicles', value: availableVehicles, sub: 'Ready for assignment', to: '/operators?availability=Available' },
  ];

  const weeklyActivity = useMemo(() => {
    const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const map = new Map<string, { day: string; requests: number; completed: number }>(
      order.map((day) => [day, { day, requests: 0, completed: 0 }])
    );

    requests.forEach((r) => {
      const dt = new Date(r.submittedAt);
      if (Number.isNaN(dt.getTime())) return;
      const dayLabel = WEEKDAY_LABELS[dt.getDay()];
      const entry = map.get(dayLabel);
      if (!entry) return;
      entry.requests += 1;
      if (r.status === 'Completed') {
        entry.completed += 1;
      }
    });

    return order.map((day) => map.get(day)!);
  }, [requests]);

  const monthlyRevenueSeries = useMemo(() => {
    const buckets = new Map<
      string,
      { sortKey: string; month: string; completedRevenue: number; pipelineRevenue: number }
    >();

    requests.forEach((r) => {
      if (r.status === 'Cancelled') return;
      const dt = new Date(r.submittedAt);
      if (Number.isNaN(dt.getTime())) return;
      const sortKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const month = dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const current = buckets.get(sortKey) ?? {
        sortKey,
        month,
        completedRevenue: 0,
        pipelineRevenue: 0,
      };
      if (r.status === 'Completed') {
        current.completedRevenue += r.priceEtb;
      } else {
        current.pipelineRevenue += r.priceEtb;
      }
      buckets.set(sortKey, current);
    });

    return Array.from(buckets.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [requests]);

  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 5);

  const recentOperators = [...operators]
    .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime())
    .slice(0, 4);

  const operatorCounts = OPERATOR_STATUS_ORDER.map((status) => ({
    status,
    count: operators.filter((o) => o.availability === status).length,
  }));

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top welcome & quick-action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-[#202A24] tracking-tight">
            Welcome, {settings.adminName.split(' ')[0]}
          </h2>
          <p className="text-xs text-[#758078] mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>{todayFormatted}</span>
            <span aria-hidden="true">·</span>
            <span>Addis Ababa Dispatch Operations</span>
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 shrink-0">
          <Link
            to="/requests"
            className="inline-flex items-center justify-center gap-2 px-3 py-2 min-h-[44px] sm:min-h-[38px] text-xs font-medium text-[#202A24] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0] transition-colors whitespace-nowrap"
          >
            <Bell className="w-3.5 h-3.5 text-[#123C2A] shrink-0" />
            <span className="truncate">{unreadNotifs} Alerts</span>
          </Link>
          <button
            type="button"
            onClick={() => setRegisterModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 min-h-[44px] sm:min-h-[38px] text-xs font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Register Operator</span>
          </button>
        </div>
      </div>

      {/* 6 KPI Stat Cards */}
      <section aria-label="Operational Summary" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {stats.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="block bg-white border border-[#E6EAE5] rounded-xl p-3.5 sm:p-4 shadow-[0_1px_2px_rgba(18,60,42,0.03)] cursor-pointer transition-all duration-150 hover:border-[#123C2A]/45 hover:bg-[#F7F6F0]/45 hover:shadow-[0_3px_10px_rgba(18,60,42,0.08)] active:scale-[0.98] active:bg-[#DCE8DF]/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#123C2A] focus-visible:ring-offset-1 min-w-0"
          >
            <p className="text-xs font-medium text-[#758078] truncate">{item.label}</p>
            <p className="text-xl sm:text-2xl font-semibold text-[#202A24] font-mono tabular-nums mt-1.5 sm:mt-2">
              {item.value}
            </p>
            <p className="text-[11px] text-[#758078] mt-1 truncate">{item.sub}</p>
          </Link>
        ))}
      </section>

      {/* Charts row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#202A24]">Service Request Activity</h3>
              <p className="text-xs text-[#758078] mt-0.5">
                Day-of-week distribution from Supabase service_requests
              </p>
            </div>
            <Link
              to="/reports"
              className="text-xs font-medium text-[#123C2A] hover:underline whitespace-nowrap py-1 shrink-0"
            >
              View reports
            </Link>
          </div>
          {requests.length === 0 ? (
            <div className="h-56 sm:h-64 flex items-center justify-center text-xs text-[#758078] bg-[#F7F6F0]/60 rounded-lg border border-dashed border-[#E6EAE5]">
              No service requests recorded yet.
            </div>
          ) : (
            <div className="h-56 sm:h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyActivity} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6EAE5" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#758078' }} axisLine={false} tickLine={false} />
                  <YAxis width={36} tick={{ fontSize: 11, fill: '#758078' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E6EAE5',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="requests" name="Submitted" fill="#DCE8DF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#123C2A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#202A24]">Service Order Value (ETB)</h3>
              <p className="text-xs text-[#758078] mt-0.5">
                Completed vs open request totals from service_priorities
              </p>
            </div>
            <Link
              to="/finance"
              className="text-xs font-medium text-[#123C2A] hover:underline whitespace-nowrap py-1 shrink-0"
            >
              Open finance
            </Link>
          </div>
          {monthlyRevenueSeries.length === 0 ? (
            <div className="h-56 sm:h-64 flex items-center justify-center text-xs text-[#758078] bg-[#F7F6F0]/60 rounded-lg border border-dashed border-[#E6EAE5]">
              No priced service orders found in Supabase.
            </div>
          ) : (
            <div className="h-56 sm:h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenueSeries} margin={{ top: 8, right: 6, left: -10, bottom: 0 }}>
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
                  <Area
                    type="monotone"
                    dataKey="completedRevenue"
                    name="Completed Orders"
                    stroke="#123C2A"
                    strokeWidth={2}
                    fill="#DCE8DF"
                    fillOpacity={0.75}
                  />
                  <Area
                    type="monotone"
                    dataKey="pipelineRevenue"
                    name="Open Pipeline"
                    stroke="#758078"
                    strokeWidth={1.5}
                    fill="#F7F6F0"
                    fillOpacity={0.4}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* Recent Requests + Operator Availability */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="xl:col-span-2 bg-white border border-[#E6EAE5] rounded-xl overflow-hidden min-w-0">
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#E6EAE5] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#202A24]">Recent Service Requests</h3>
              <p className="text-xs text-[#758078] truncate">Latest customer requests needing triage or dispatch</p>
            </div>
            <Link
              to="/requests"
              className="inline-flex items-center gap-1 py-1.5 text-xs font-medium text-[#123C2A] hover:underline whitespace-nowrap shrink-0"
            >
              All requests
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentRequests.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#758078]">
              No service requests found in Supabase.
            </div>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-[#E6EAE5]">
                {recentRequests.map((req) => {
                  const callable = isCallablePhone(req.customerPhone);
                  return (
                    <div key={req.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            to={`/requests/${req.id}`}
                            className="font-mono text-xs font-semibold text-[#123C2A] hover:underline block truncate"
                          >
                            {req.referenceNumber}
                          </Link>
                          <p className="text-sm font-medium text-[#202A24] truncate mt-0.5">
                            {req.customerName}
                          </p>
                          <p className="text-xs font-mono font-medium text-[#123C2A] mt-0.5 inline-flex items-center gap-1 break-all">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span>{callable ? req.customerPhone : 'No phone on file'}</span>
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
                          <StatusBadge status={req.priority} />
                          <StatusBadge status={req.status} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-[#758078]">
                        <span className="truncate">
                          {req.subcityName} · {req.neighbourhoodName}
                        </span>
                        <span className="font-mono tabular-nums font-semibold text-[#202A24] shrink-0">
                          {formatETB(req.priceEtb)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        {callable && (
                          <a
                            href={toTelHref(req.customerPhone)}
                            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 text-xs font-semibold text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21]"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Call Customer</span>
                          </a>
                        )}
                        <Link
                          to={`/requests/${req.id}`}
                          className="flex-1 inline-flex items-center justify-center gap-1 min-h-[44px] px-3 py-2 text-xs font-medium text-[#123C2A] bg-[#DCE8DF]/50 rounded-lg"
                        >
                          <span>Open Request</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E6EAE5] bg-[#F7F6F0]/60 text-[11px] font-semibold text-[#758078] uppercase tracking-wider">
                      <th className="py-2.5 px-4">Reference</th>
                      <th className="py-2.5 px-4">Customer</th>
                      <th className="py-2.5 px-4">Area</th>
                      <th className="py-2.5 px-4">Priority</th>
                      <th className="py-2.5 px-4 text-right">Price</th>
                      <th className="py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6EAE5] text-sm">
                    {recentRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-[#F7F6F0]/70 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs font-medium text-[#123C2A] whitespace-nowrap">
                          <Link to={`/requests/${req.id}`} className="hover:underline">
                            {req.referenceNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-xs font-medium text-[#202A24]">{req.customerName}</p>
                          {isCallablePhone(req.customerPhone) ? (
                            <a
                              href={toTelHref(req.customerPhone)}
                              className="text-[11px] text-[#123C2A] font-mono hover:underline inline-block mt-0.5"
                            >
                              {req.customerPhone}
                            </a>
                          ) : (
                            <p className="text-[11px] text-[#758078] font-mono">—</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-[#202A24] whitespace-nowrap">
                          {req.subcityName} · {req.neighbourhoodName}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={req.priority} />
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-[#202A24] whitespace-nowrap">
                          {formatETB(req.priceEtb)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={req.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Operator Availability Overview */}
        <div className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[#202A24]">Operator Availability</h3>
                <p className="text-xs text-[#758078]">Current fleet status distribution</p>
              </div>
              <Link
                to="/operators"
                className="text-xs font-medium text-[#123C2A] hover:underline whitespace-nowrap py-1"
              >
                Manage fleet
              </Link>
            </div>
            <div className="space-y-3.5">
              {operatorCounts.map(({ status, count }) => {
                const pct = registeredOperators > 0 ? Math.round((count / registeredOperators) * 100) : 0;
                return (
                  <div key={status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <StatusBadge status={status} />
                      <span className="font-mono tabular-nums text-[#202A24] font-medium">
                        {count} <span className="text-[#758078]">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-[#F7F6F0] rounded-full overflow-hidden border border-[#E6EAE5]">
                      <div
                        className="h-full bg-[#123C2A] rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E6EAE5] flex items-center justify-between text-xs text-[#758078]">
            <span>Total fleet capacity</span>
            <span className="font-mono tabular-nums font-semibold text-[#202A24]">
              {formatLitres(operators.reduce((sum, o) => sum + o.tankCapacityLitres, 0))}
            </span>
          </div>
        </div>
      </section>

      {/* Recently Registered Operators & Activity Feed */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden min-w-0">
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#E6EAE5] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#202A24]">Recently Registered Operators</h3>
              <p className="text-xs text-[#758078] truncate">Staff-onboarded partner drivers and trucks</p>
            </div>
            <Link to="/operators" className="text-xs font-medium text-[#123C2A] hover:underline whitespace-nowrap shrink-0">
              Directory
            </Link>
          </div>
          {recentOperators.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#758078]">
              No vehicle operators registered yet.
            </div>
          ) : (
            <ul className="divide-y divide-[#E6EAE5]">
              {recentOperators.map((op) => (
                <li key={op.id} className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-[#F7F6F0]/50">
                  <div className="min-w-0">
                    <Link
                      to={`/operators/${op.id}`}
                      className="text-sm font-medium text-[#202A24] hover:text-[#123C2A] hover:underline truncate block"
                    >
                      {op.fullName}
                    </Link>
                    <p className="text-xs text-[#758078] mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="font-mono">{op.vehiclePlate || 'No plate'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatLitres(op.tankCapacityLitres)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{op.subcityName}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`tel:${op.primaryPhone.replace(/[^+\d]/g, '')}`}
                      aria-label={`Call ${op.fullName}`}
                      className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 rounded-lg border border-[#E6EAE5] text-[#123C2A] hover:bg-[#DCE8DF]/60 transition-colors"
                    >
                      <Phone className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    </a>
                    <StatusBadge status={op.availability} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E6EAE5] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#202A24]">Recent Activity Feed</h3>
              <p className="text-xs text-[#758078]">Latest service requests and dispatch activity</p>
            </div>
            <span className="text-xs text-[#758078]">{formatDate(new Date().toISOString())}</span>
          </div>
          {activityFeed.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#758078]">
              No recent activity recorded yet.
            </div>
          ) : (
            <ul className="divide-y divide-[#E6EAE5]">
              {activityFeed.slice(0, 5).map((item) => (
                <li key={item.id} className="px-5 py-3.5 flex items-start justify-between gap-3">
                  <div className="text-xs leading-relaxed min-w-0">
                    <span className="font-semibold text-[#202A24]">{item.actor}</span>{' '}
                    <span className="text-[#758078]">{item.action}</span>{' '}
                    {item.linkTo ? (
                      <Link to={item.linkTo} className="font-medium text-[#123C2A] hover:underline">
                        {item.subject}
                      </Link>
                    ) : (
                      <span className="font-medium text-[#202A24]">{item.subject}</span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#758078] font-mono tabular-nums whitespace-nowrap shrink-0">
                    {formatTimeAgo(item.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
