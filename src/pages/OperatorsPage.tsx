import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  UserPlus,
  Phone,
  Truck,
  ArrowUpDown,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { ViewModeToggle } from '../components/ui/ViewModeToggle';
import { useResponsiveViewMode } from '../hooks/useResponsiveViewMode';
import { formatDate, formatLitres, toTelHref } from '../utils/formatters';
import { OperatorStatus, VehicleType } from '../types';

const PAGE_SIZE = 6;

const VEHICLE_TYPES: VehicleType[] = [
  'Light Vacuum Truck',
  'Medium Tanker',
  'Heavy Vacuum Tanker',
  'Industrial Septic Truck',
];

const STATUSES: OperatorStatus[] = [
  'Available',
  'Assigned',
  'Busy',
  'Unavailable',
  'Suspended',
];

function normalizeAvailabilityParam(raw: string | null): string {
  if (!raw) return '';
  const lower = raw.trim().toLowerCase();
  const matched = STATUSES.find((s) => s.toLowerCase() === lower);
  return matched ?? '';
}

export function OperatorsPage() {
  const { operators, subcities, setRegisterModalOpen } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useResponsiveViewMode('operators');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [subcityFilter, setSubcityFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState(() =>
    normalizeAvailabilityParam(searchParams.get('availability'))
  );
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const nextAvailability = normalizeAvailabilityParam(searchParams.get('availability'));
    setAvailabilityFilter(nextAvailability);
    setPage(1);
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return operators
      .filter((op) => {
        if (q) {
          const matchesText =
            op.fullName.toLowerCase().includes(q) ||
            op.primaryPhone.toLowerCase().includes(q) ||
            op.vehiclePlate.toLowerCase().includes(q);
          if (!matchesText) return false;
        }
        if (vehicleFilter && op.vehicleType !== vehicleFilter) return false;
        if (subcityFilter && op.subcityId !== subcityFilter) return false;
        if (availabilityFilter && op.availability !== availabilityFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const ta = new Date(a.registeredAt).getTime();
        const tb = new Date(b.registeredAt).getTime();
        return sortOrder === 'newest' ? tb - ta : ta - tb;
      });
  }, [operators, search, vehicleFilter, subcityFilter, availabilityFilter, sortOrder]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const handleAvailabilityChange = (nextVal: string) => {
    setAvailabilityFilter(nextVal);
    setPage(1);
    const nextParams = new URLSearchParams(searchParams);
    if (!nextVal) {
      nextParams.delete('availability');
    } else {
      nextParams.set('availability', nextVal);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const resetFilters = () => {
    setSearch('');
    setVehicleFilter('');
    setSubcityFilter('');
    setAvailabilityFilter('');
    setPage(1);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('availability');
    setSearchParams(nextParams, { replace: true });
  };

  const secondaryFilterCount = [vehicleFilter, subcityFilter].filter(Boolean).length;

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0">
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[#202A24]">Vehicle Operators Directory</h2>
          <p className="text-xs text-[#758078] mt-0.5">
            Centrally managed by Zblal staff in Supabase (vehicle_operators + operator_vehicles). Operators cannot self-register or log in.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 shrink-0">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />

          <button
            type="button"
            onClick={() => setRegisterModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 min-h-[44px] sm:min-h-[36px] text-xs font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            Register Operator
          </button>
        </div>
      </div>

      {/* Search & filters */}
      <div className="bg-white border border-[#E6EAE5] rounded-xl p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
        <div className="relative lg:col-span-1">
          <Search className="w-4 h-4 text-[#758078] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Name, phone, plate..."
            className="w-full min-h-[44px] sm:min-h-[36px] pl-9 pr-3 py-2 text-xs bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg focus:outline-none focus:bg-white focus:border-[#123C2A]"
          />
        </div>

        <div className="flex items-center gap-2 sm:contents">
          <select
            value={availabilityFilter}
            onChange={(e) => handleAvailabilityChange(e.target.value)}
            aria-label="Filter by availability"
            className="flex-1 min-w-0 min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
          >
            <option value="">All availability</option>
            {STATUSES.map((st) => (
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
            value={vehicleFilter}
            onChange={(e) => {
              setVehicleFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by vehicle type"
            className="min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
          >
            <option value="">All vehicle types</option>
            {VEHICLE_TYPES.map((vt) => (
              <option key={vt} value={vt}>
                {vt}
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

          <button
            type="button"
            onClick={() => setSortOrder((s) => (s === 'newest' ? 'oldest' : 'newest'))}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium text-[#202A24] bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg hover:bg-[#DCE8DF]/40 transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#758078]" />
            <span>Registered: {sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
          </button>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          title={operators.length === 0 ? 'No operators registered yet' : 'No matching operators'}
          description={
            operators.length === 0
              ? 'Register your first vehicle operator and truck to begin dispatching.'
              : 'Try clearing your search or adjusting vehicle type, subcity, or availability filters.'
          }
          action={
            operators.length === 0 ? (
              <button
                type="button"
                onClick={() => setRegisterModalOpen(true)}
                className="px-4 py-2 min-h-[44px] sm:min-h-0 text-xs font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21]"
              >
                Register Operator
              </button>
            ) : (
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 min-h-[44px] sm:min-h-0 text-xs font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21]"
              >
                Clear filters
              </button>
            )
          }
        />
      ) : viewMode === 'table' ? (
        <div className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E6EAE5] bg-[#F7F6F0]/70 text-[11px] font-semibold text-[#758078] uppercase tracking-wider">
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Vehicle Plate</th>
                  <th className="py-3 px-4">Vehicle Type</th>
                  <th className="py-3 px-4 text-right">Tank Capacity</th>
                  <th className="py-3 px-4">Operating Area</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAE5] text-sm">
                {paginated.map((op) => (
                  <tr key={op.id} className="hover:bg-[#F7F6F0]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/operators/${op.id}`}
                        className="font-medium text-[#202A24] hover:text-[#123C2A] hover:underline"
                      >
                        {op.fullName}
                      </Link>
                      <p className="text-[11px] text-[#758078] mt-0.5">
                        Added {formatDate(op.registeredAt)}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[#202A24] whitespace-nowrap">
                      <a href={toTelHref(op.primaryPhone)} className="hover:text-[#123C2A] hover:underline">
                        {op.primaryPhone}
                      </a>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-medium text-[#202A24] whitespace-nowrap">
                      {op.vehiclePlate || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#202A24] whitespace-nowrap">
                      {op.vehicleType}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums text-[#202A24] whitespace-nowrap">
                      {formatLitres(op.tankCapacityLitres)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#202A24] whitespace-nowrap">
                      {op.subcityName} · {op.neighbourhoodName}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={op.availability} />
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/operators/${op.id}`}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-[#123C2A] bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg hover:bg-[#DCE8DF] transition-colors"
                      >
                        View Profile
                      </Link>
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
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
            {paginated.map((op) => {
              const isExpanded = Boolean(expandedCards[op.id]);
              return (
                <article
                  key={op.id}
                  className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden flex flex-col min-w-0"
                >
                  {/* Responsive media header: compact horizontal on narrow phones, full banner on sm+ */}
                  <div className="hidden sm:block aspect-[16/9] bg-[#DCE8DF]/40 relative overflow-hidden border-b border-[#E6EAE5]">
                    {op.vehiclePhotoUrl ? (
                      <img
                        src={op.vehiclePhotoUrl}
                        alt={`${op.vehicleType} (${op.vehiclePlate})`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#123C2A]">
                        <Truck className="w-8 h-8 mb-1" />
                        <span className="text-xs font-medium">{op.vehicleType}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between gap-3.5">
                    <div>
                      <div className="flex items-start gap-3">
                        <div className="sm:hidden w-14 h-14 rounded-lg overflow-hidden border border-[#E6EAE5] bg-[#DCE8DF]/40 shrink-0 flex items-center justify-center text-[#123C2A]">
                          {op.vehiclePhotoUrl ? (
                            <img
                              src={op.vehiclePhotoUrl}
                              alt={`${op.vehicleType}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Truck className="w-6 h-6" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-[#202A24] truncate">
                              {op.fullName}
                            </h3>
                            <p className="text-xs font-mono text-[#758078] mt-0.5 truncate">
                              {op.primaryPhone}
                            </p>
                          </div>
                          <StatusBadge status={op.availability} />
                        </div>
                      </div>

                      <dl className="mt-3.5 grid grid-cols-2 gap-y-2 gap-x-3 text-xs border-t border-[#E6EAE5] pt-3">
                        <div>
                          <dt className="text-[#758078] text-[11px]">Plate Number</dt>
                          <dd className="font-mono font-medium text-[#202A24] mt-0.5">
                            {op.vehiclePlate || '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[#758078] text-[11px]">Capacity</dt>
                          <dd className="font-mono font-medium tabular-nums text-[#202A24] mt-0.5">
                            {formatLitres(op.tankCapacityLitres)}
                          </dd>
                        </div>
                        <div className="col-span-2 min-w-0">
                          <dt className="text-[#758078] text-[11px]">Operating Area</dt>
                          <dd className="text-[#202A24] mt-0.5 truncate">
                            {op.subcityName} · {op.neighbourhoodName}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCards((prev) => ({ ...prev, [op.id]: !prev[op.id] }))
                          }
                          aria-expanded={isExpanded}
                          className="inline-flex items-center gap-1 py-1 text-[11px] font-medium text-[#758078] hover:text-[#123C2A]"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" />
                              Hide vehicle &amp; stats
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" />
                              More details (type, jobs)
                            </>
                          )}
                        </button>

                        {isExpanded && (
                          <dl className="mt-2 pt-2.5 border-t border-[#E6EAE5] grid grid-cols-2 gap-2 text-xs">
                            <div className="col-span-2">
                              <dt className="text-[#758078] text-[11px]">Vehicle Type</dt>
                              <dd className="text-[#202A24] mt-0.5">{op.vehicleType}</dd>
                            </div>
                            <div>
                              <dt className="text-[#758078] text-[11px]">Completed Jobs</dt>
                              <dd className="font-mono text-[#202A24] mt-0.5 tabular-nums">
                                {op.completedJobsCount}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[#758078] text-[11px]">Registered</dt>
                              <dd className="font-mono text-[#202A24] mt-0.5">
                                {formatDate(op.registeredAt)}
                              </dd>
                            </div>
                            {op.vehicleNotes && (
                              <div className="col-span-2">
                                <dt className="text-[#758078] text-[11px]">Vehicle Notes</dt>
                                <dd className="text-[#202A24] mt-0.5 break-words">{op.vehicleNotes}</dd>
                              </div>
                            )}
                          </dl>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2.5 border-t border-[#E6EAE5]">
                      <a
                        href={toTelHref(op.primaryPhone)}
                        className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-3.5 py-2 text-xs font-medium text-[#123C2A] bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg hover:bg-[#DCE8DF] transition-colors shrink-0"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Call
                      </a>
                      <Link
                        to={`/operators/${op.id}`}
                        className="flex-1 inline-flex items-center justify-center min-h-[44px] sm:min-h-[38px] px-3 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] transition-colors"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="bg-white border border-[#E6EAE5] rounded-xl px-4 pb-4">
            <Pagination
              currentPage={page}
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
