import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  ArrowUpDown,
  RefreshCw,
  Phone,
  MapPin,
  Calendar,
  Truck,
  ArrowUpRight,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { ViewModeToggle } from '../components/ui/ViewModeToggle';
import { RequestStatusControl } from '../components/requests/RequestStatusControl';
import { useResponsiveViewMode } from '../hooks/useResponsiveViewMode';
import { formatDate, formatETB, formatLitres, isCallablePhone, toTelHref } from '../utils/formatters';
import { RequestStatus } from '../types';

const PAGE_SIZE = 7;

const STATUS_OPTIONS: RequestStatus[] = [
  'Pending',
  'Operator Selected',
  'Operator Contacted',
  'Assigned',
  'In Progress',
  'Completed',
  'Cancelled',
];

function normalizeStatusParam(raw: string | null): string {
  if (!raw) return '';
  const lower = raw.trim().toLowerCase();
  if (lower === 'pending' || lower === 'pending_group') return 'pending_group';
  if (lower === 'active' || lower === 'active_group') return 'active_group';
  const matched = STATUS_OPTIONS.find((s) => s.toLowerCase() === lower);
  return matched ?? '';
}

export function ServiceRequestsPage() {
  const { requests, operators, subcities, priorities, loadingData, refreshData } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useResponsiveViewMode('service_requests');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(() =>
    normalizeStatusParam(searchParams.get('status'))
  );
  const [priorityFilter, setPriorityFilter] = useState('');
  const [subcityFilter, setSubcityFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price'>('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const nextStatus = normalizeStatusParam(searchParams.get('status'));
    setStatusFilter(nextStatus);
    setPage(1);
  }, [searchParams]);

  const priorityOptions = useMemo(() => {
    const names = new Set<string>(['Standard', 'Urgent', 'Emergency']);
    priorities.forEach((p) => {
      if (p.name) names.add(p.name);
    });
    requests.forEach((r) => {
      if (r.priority) names.add(String(r.priority));
    });
    return Array.from(names);
  }, [priorities, requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests
      .filter((r) => {
        if (q) {
          const match =
            r.referenceNumber.toLowerCase().includes(q) ||
            r.customerPhone.toLowerCase().includes(q) ||
            r.customerName.toLowerCase().includes(q);
          if (!match) return false;
        }
        if (statusFilter === 'pending_group') {
          if (
            r.status !== 'Pending' &&
            r.status !== 'Operator Selected' &&
            r.status !== 'Operator Contacted'
          ) {
            return false;
          }
        } else if (statusFilter === 'active_group') {
          if (r.status !== 'Assigned' && r.status !== 'In Progress') {
            return false;
          }
        } else if (statusFilter && r.status !== statusFilter) {
          return false;
        }
        if (priorityFilter && String(r.priority) !== priorityFilter) return false;
        if (subcityFilter && r.subcityId !== subcityFilter) return false;
        if (dateFilter && !r.submittedAt.startsWith(dateFilter)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price') return b.priceEtb - a.priceEtb;
        const ta = new Date(a.submittedAt).getTime();
        const tb = new Date(b.submittedAt).getTime();
        return sortBy === 'newest' ? tb - ta : ta - tb;
      });
  }, [requests, search, statusFilter, priorityFilter, subcityFilter, dateFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const handleStatusChange = (nextVal: string) => {
    setStatusFilter(nextVal);
    setPage(1);
    const nextParams = new URLSearchParams(searchParams);
    if (!nextVal) {
      nextParams.delete('status');
    } else if (nextVal === 'pending_group') {
      nextParams.set('status', 'pending');
    } else if (nextVal === 'active_group') {
      nextParams.set('status', 'active');
    } else {
      nextParams.set('status', nextVal);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setSubcityFilter('');
    setDateFilter('');
    setPage(1);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('status');
    setSearchParams(nextParams, { replace: true });
  };

  const hasActiveFilters = Boolean(
    search.trim() || statusFilter || priorityFilter || subcityFilter || dateFilter
  );
  const secondaryFilterCount = [priorityFilter, subcityFilter, dateFilter].filter(Boolean).length;

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0">
      {/* Header + View Switcher + Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[#202A24]">Service Requests</h2>
          <p className="text-xs text-[#758078] mt-0.5">
            Track customer septic emptying requests from Supabase, call customers or operators, and manage request status.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 shrink-0">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />

          <button
            type="button"
            disabled={loadingData}
            onClick={() => void refreshData()}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] sm:min-h-[36px] text-xs font-medium text-[#123C2A] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0] whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E6EAE5] rounded-xl p-3.5 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 sm:gap-3">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="w-4 h-4 text-[#758078] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search ref, customer name, or phone..."
              className="w-full min-h-[44px] sm:min-h-[36px] pl-9 pr-3 py-2 text-xs bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg focus:outline-none focus:bg-white focus:border-[#123C2A]"
            />
          </div>

          <div className="flex items-center gap-2 sm:contents">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              aria-label="Filter by status"
              className="flex-1 min-w-0 min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            >
              <option value="">All statuses</option>
              <option value="pending_group">Pending &amp; Dispatching</option>
              <option value="active_group">Active (Assigned / In Progress)</option>
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              className={`sm:hidden inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 py-2 text-xs font-medium rounded-lg border transition-colors shrink-0 ${
                filtersOpen || secondaryFilterCount > 0
                  ? 'bg-[#DCE8DF]/60 border-[#123C2A]/30 text-[#123C2A]'
                  : 'bg-[#F7F6F0] border-[#E6EAE5] text-[#202A24]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters{secondaryFilterCount > 0 ? ` (${secondaryFilterCount})` : ''}</span>
            </button>
          </div>

          <div className={`${filtersOpen ? 'grid' : 'hidden'} sm:contents grid-cols-1 gap-2.5`}>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by priority"
              className="min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            >
              <option value="">All priorities</option>
              {priorityOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              value={subcityFilter}
              onChange={(e) => {
                setSubcityFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by subcity"
              className="min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            >
              <option value="">All subcities</option>
              {subcities.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.nameEn}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by submission date"
                className="w-full min-w-0 min-h-[44px] sm:min-h-[36px] px-2.5 py-2 text-xs bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
              />
              <button
                type="button"
                onClick={() =>
                  setSortBy((prev) =>
                    prev === 'newest' ? 'oldest' : prev === 'oldest' ? 'price' : 'newest'
                  )
                }
                title={`Sort: ${sortBy}`}
                aria-label={`Change sort order (currently ${sortBy})`}
                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] p-2 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg text-[#202A24] hover:bg-[#DCE8DF]/50 shrink-0"
              >
                <ArrowUpDown className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[#758078]">
          <span>
            Showing <strong className="font-mono text-[#202A24]">{filtered.length}</strong> of{' '}
            <strong className="font-mono text-[#202A24]">{requests.length}</strong> requests
            {' · '}Sorted by{' '}
            <span className="font-medium text-[#202A24]">
              {sortBy === 'newest' ? 'Newest first' : sortBy === 'oldest' ? 'Oldest first' : 'Highest price'}
            </span>
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="py-1 text-xs font-medium text-[#123C2A] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          title={
            requests.length === 0
              ? 'No service requests in Supabase yet'
              : 'No service requests match your filters'
          }
          description={
            requests.length === 0
              ? 'Customer service requests submitted on the customer website will appear here automatically.'
              : 'Adjust your search query, status, priority, subcity, or date filter.'
          }
          action={
            requests.length > 0 ? (
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 min-h-[44px] sm:min-h-0 text-xs font-medium text-white bg-[#123C2A] rounded-lg"
              >
                Reset filters
              </button>
            ) : undefined
          }
        />
      ) : viewMode === 'table' ? (
        <div className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E6EAE5] bg-[#F7F6F0]/70 text-[11px] font-semibold text-[#758078] uppercase tracking-wider">
                  <th className="py-3 px-4 whitespace-nowrap">Reference</th>
                  <th className="py-3 px-4 whitespace-nowrap">Customer</th>
                  <th className="py-3 px-4 whitespace-nowrap">Customer Phone</th>
                  <th className="py-3 px-4 whitespace-nowrap">Subcity &amp; Neighbourhood</th>
                  <th className="py-3 px-4 whitespace-nowrap">Priority</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Price</th>
                  <th className="py-3 px-4 whitespace-nowrap">Request Date</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 whitespace-nowrap">Assigned Operator</th>
                  <th className="py-3 px-4 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAE5] text-xs">
                {paginated.map((req) => {
                  const assignedOp = operators.find((o) => o.id === req.assignedOperatorId);
                  const callable = isCallablePhone(req.customerPhone);
                  return (
                    <tr key={req.id} className="hover:bg-[#F7F6F0]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-[#123C2A] whitespace-nowrap">
                        <Link to={`/requests/${req.id}`} className="hover:underline">
                          {req.referenceNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {req.customerId ? (
                          <Link
                            to={`/customers/${req.customerId}`}
                            className="font-medium text-[#202A24] hover:text-[#123C2A] hover:underline"
                          >
                            {req.customerName}
                          </Link>
                        ) : (
                          <span className="font-medium text-[#202A24]">{req.customerName}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {callable ? (
                          <a
                            href={toTelHref(req.customerPhone)}
                            className="inline-flex items-center gap-1.5 font-mono text-[#123C2A] font-medium hover:underline"
                            title={`Call ${req.customerName}`}
                          >
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span>{req.customerPhone}</span>
                          </a>
                        ) : (
                          <span className="font-mono text-[#758078]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#202A24] whitespace-nowrap">
                        {req.subcityName} · {req.neighbourhoodName}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={req.priority} />
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-medium text-[#202A24] whitespace-nowrap">
                        {formatETB(req.priceEtb)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#758078] whitespace-nowrap">
                        {formatDate(req.submittedAt)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {assignedOp ? (
                          <Link
                            to={`/operators/${assignedOp.id}`}
                            className="text-[#123C2A] font-medium hover:underline"
                          >
                            {assignedOp.fullName}
                          </Link>
                        ) : (
                          <span className="text-[#758078]">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-start gap-2">
                          <RequestStatusControl request={req} variant="compact" />
                          <Link
                            to={`/requests/${req.id}`}
                            className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-medium text-[#123C2A] bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg hover:bg-[#DCE8DF] transition-colors shrink-0"
                          >
                            <span>Details</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4">
            <Pagination
              currentPage={safePage}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
            {paginated.map((req) => {
              const assignedOp = operators.find((o) => o.id === req.assignedOperatorId);
              const callable = isCallablePhone(req.customerPhone);
              const isExpanded = Boolean(expandedCards[req.id]);
              return (
                <article
                  key={req.id}
                  className="bg-white border border-[#E6EAE5] rounded-xl p-4 flex flex-col justify-between gap-3.5 shadow-[0_1px_2px_rgba(18,60,42,0.03)] min-w-0"
                >
                  {/* Card Header: Reference + Badges */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0">
                      <Link
                        to={`/requests/${req.id}`}
                        className="font-mono text-sm font-semibold text-[#123C2A] hover:underline block truncate"
                      >
                        {req.referenceNumber}
                      </Link>
                      <p className="text-[11px] text-[#758078] font-mono mt-0.5 inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>{formatDate(req.submittedAt)}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                      <StatusBadge status={req.priority} />
                      <StatusBadge status={req.status} />
                    </div>
                  </div>

                  {/* Customer Name, Always-Visible Phone & Call Customer CTA */}
                  <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg space-y-2.5 min-w-0">
                    <div className="min-w-0">
                      <p className="text-[11px] text-[#758078]">Customer</p>
                      {req.customerId ? (
                        <Link
                          to={`/customers/${req.customerId}`}
                          className="text-sm font-semibold text-[#202A24] hover:text-[#123C2A] hover:underline block truncate"
                        >
                          {req.customerName}
                        </Link>
                      ) : (
                        <p className="text-sm font-semibold text-[#202A24] truncate">
                          {req.customerName}
                        </p>
                      )}
                      <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-mono font-semibold text-[#123C2A] break-all">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{callable ? req.customerPhone : 'No phone on file'}</span>
                      </p>
                    </div>

                    {callable && (
                      <a
                        href={toTelHref(req.customerPhone)}
                        aria-label={`Call ${req.customerName} at ${req.customerPhone}`}
                        className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] active:scale-[0.98] transition-all"
                      >
                        <Phone className="w-4 h-4 shrink-0" />
                        <span>Call Customer</span>
                      </a>
                    )}
                  </div>

                  {/* Primary Service Details Grid */}
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
                    <div className="col-span-2 min-w-0">
                      <dt className="text-[11px] text-[#758078] flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>Service Location</span>
                      </dt>
                      <dd className="text-[#202A24] font-medium mt-0.5 break-words">
                        {req.subcityName} · {req.neighbourhoodName}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-[11px] text-[#758078]">Price</dt>
                      <dd className="font-mono tabular-nums font-semibold text-[#123C2A] mt-0.5">
                        {formatETB(req.priceEtb)}
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-[11px] text-[#758078] flex items-center gap-1">
                        <Truck className="w-3 h-3 shrink-0" />
                        <span>Assigned Operator</span>
                      </dt>
                      <dd className="mt-0.5 truncate">
                        {assignedOp ? (
                          <Link
                            to={`/operators/${assignedOp.id}`}
                            className="font-medium text-[#123C2A] hover:underline"
                          >
                            {assignedOp.fullName}
                          </Link>
                        ) : (
                          <span className="text-[#758078]">Unassigned</span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {/* Expandable Secondary Details */}
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCards((prev) => ({ ...prev, [req.id]: !prev[req.id] }))
                      }
                      aria-expanded={isExpanded}
                      className="inline-flex items-center gap-1 py-1 text-[11px] font-medium text-[#758078] hover:text-[#123C2A]"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          Hide extra details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          More details (volume, landmark)
                        </>
                      )}
                    </button>

                    {isExpanded && (
                      <dl className="mt-2 pt-2.5 border-t border-[#E6EAE5] space-y-2 text-xs">
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#758078] shrink-0">Est. Volume</dt>
                          <dd className="font-mono text-[#202A24] tabular-nums">
                            {formatLitres(req.estimatedVolumeLitres)}
                          </dd>
                        </div>
                        {req.streetLandmark && (
                          <div>
                            <dt className="text-[#758078]">Landmark / Access</dt>
                            <dd className="text-[#202A24] mt-0.5 break-words">{req.streetLandmark}</dd>
                          </div>
                        )}
                        {req.customerNotes && (
                          <div>
                            <dt className="text-[#758078]">Customer Notes</dt>
                            <dd className="text-[#202A24] mt-0.5 break-words">{req.customerNotes}</dd>
                          </div>
                        )}
                      </dl>
                    )}
                  </div>

                  {/* Footer Actions: Status Selector + View Details */}
                  <div className="pt-3 border-t border-[#E6EAE5] flex flex-col gap-2.5">
                    <div>
                      <p className="text-[11px] font-medium text-[#758078] mb-1">Update Status</p>
                      <RequestStatusControl request={req} variant="card" />
                    </div>

                    <Link
                      to={`/requests/${req.id}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-2 text-xs font-medium text-[#123C2A] bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg hover:bg-[#DCE8DF] active:scale-[0.99] transition-all"
                    >
                      <span>View Details</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="bg-white border border-[#E6EAE5] rounded-xl px-4 pb-4">
            <Pagination
              currentPage={safePage}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
