import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Phone, MapPin, Calendar, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { ViewModeToggle } from '../components/ui/ViewModeToggle';
import { useResponsiveViewMode } from '../hooks/useResponsiveViewMode';
import { formatDate, isCallablePhone, toTelHref } from '../utils/formatters';

const PAGE_SIZE = 6;

export function CustomersPage() {
  const { customers, requests, subcities } = useApp();
  const [viewMode, setViewMode] = useResponsiveViewMode('customers');

  const [search, setSearch] = useState('');
  const [subcityFilter, setSubcityFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);

  const enriched = useMemo(() => {
    return customers.map((c) => {
      const custReqs = requests.filter((r) => r.customerId === c.id);
      const completedCount = custReqs.filter((r) => r.status === 'Completed').length;
      return {
        ...c,
        totalRequests: custReqs.length,
        completedCount,
      };
    });
  }, [customers, requests]);

  const propertyTypes = useMemo(() => {
    const types = new Set<string>(['Residential', 'Commercial', 'Apartment Complex', 'Institution']);
    customers.forEach((c) => {
      if (c.propertyType) types.add(c.propertyType);
    });
    return Array.from(types);
  }, [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((c) => {
      if (q) {
        const match =
          c.fullName.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.neighbourhoodName.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (subcityFilter && c.subcityName !== subcityFilter) return false;
      if (propertyFilter && c.propertyType !== propertyFilter) return false;
      return true;
    });
  }, [enriched, search, subcityFilter, propertyFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const activeFilterCount = (subcityFilter ? 1 : 0) + (propertyFilter ? 1 : 0);

  const toggleCardExpand = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[#202A24]">Customers Directory</h2>
          <p className="text-xs text-[#758078] mt-0.5">
            Customer records stored in the shared Supabase customers table.
          </p>
        </div>

        <ViewModeToggle value={viewMode} onChange={setViewMode} className="self-start sm:self-auto" />
      </div>

      <div className="bg-white border border-[#E6EAE5] rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-3">
        <div className="flex items-center gap-2 sm:contents">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-[#758078] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search customer name or phone..."
              className="w-full min-h-[44px] sm:min-h-[36px] pl-9 pr-3 py-2 text-xs bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg focus:outline-none focus:bg-white focus:border-[#123C2A]"
            />
          </div>

          <button
            type="button"
            onClick={() => setMobileFiltersOpen((v) => !v)}
            aria-expanded={mobileFiltersOpen}
            className={`sm:hidden inline-flex items-center gap-1.5 min-h-[44px] px-3 text-xs font-medium rounded-lg border transition-colors shrink-0 ${
              mobileFiltersOpen || activeFilterCount > 0
                ? 'bg-[#DCE8DF]/60 text-[#123C2A] border-[#123C2A]/30'
                : 'bg-[#F7F6F0] text-[#202A24] border-[#E6EAE5]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-mono font-semibold bg-[#123C2A] text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className={`${mobileFiltersOpen ? 'grid' : 'hidden'} sm:contents grid-cols-1 gap-2.5`}>
          <select
            value={subcityFilter}
            onChange={(e) => {
              setSubcityFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by subcity"
            className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
          >
            <option value="">All subcities</option>
            {subcities.map((sc) => (
              <option key={sc.id} value={sc.nameEn}>
                {sc.nameEn}
              </option>
            ))}
          </select>

          <select
            value={propertyFilter}
            onChange={(e) => {
              setPropertyFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by property type"
            className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
          >
            <option value="">All property types</option>
            {propertyTypes.map((pt) => (
              <option key={pt} value={pt}>
                {pt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={customers.length === 0 ? 'No customers in Supabase yet' : 'No customers found'}
          description={
            customers.length === 0
              ? 'Customer records created by the customer website will appear here.'
              : 'Try clearing your search or changing the subcity/property filter.'
          }
          action={
            customers.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSubcityFilter('');
                  setPropertyFilter('');
                  setPage(1);
                }}
                className="min-h-[44px] sm:min-h-[36px] px-4 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg"
              >
                Reset filters
              </button>
            ) : undefined
          }
        />
      ) : viewMode === 'cards' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginated.map((c) => {
              const isExpanded = Boolean(expandedCards[c.id]);
              const callable = isCallablePhone(c.phone);
              return (
                <article
                  key={c.id}
                  className="bg-white border border-[#E6EAE5] rounded-xl p-4 flex flex-col justify-between gap-3 shadow-[0_1px_2px_rgba(18,60,42,0.03)] min-w-0"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0">
                        <Link
                          to={`/customers/${c.id}`}
                          className="text-sm font-semibold text-[#202A24] hover:text-[#123C2A] hover:underline block truncate"
                        >
                          {c.fullName}
                        </Link>
                        <p className="text-xs text-[#758078] mt-0.5 flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            {c.subcityName} · {c.neighbourhoodName}
                          </span>
                        </p>
                      </div>

                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-[#F7F6F0] border border-[#E6EAE5] text-[#123C2A] shrink-0">
                        {c.totalRequests} req{c.totalRequests === 1 ? '' : 's'}
                      </span>
                    </div>

                    {/* Always-visible Phone Number & Call Customer Button */}
                    <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg space-y-2.5">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-[#123C2A] break-all">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>{callable ? c.phone : 'No phone on file'}</span>
                        </span>
                      </div>
                      {callable && (
                        <a
                          href={toTelHref(c.phone)}
                          aria-label={`Call ${c.fullName} at ${c.phone}`}
                          className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] active:scale-[0.98] transition-all"
                        >
                          <Phone className="w-4 h-4 shrink-0" />
                          <span>Call Customer</span>
                        </a>
                      )}
                    </div>

                    {/* Always-visible Registration Date & Request Count */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#758078]">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>Registered {formatDate(c.registeredAt)}</span>
                      </span>
                      <span className="font-mono text-[#202A24] font-medium">
                        {c.totalRequests} service request{c.totalRequests === 1 ? '' : 's'}
                      </span>
                    </div>

                    {isExpanded && (
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t border-[#E6EAE5] text-xs">
                        <div>
                          <dt className="text-[11px] text-[#758078]">Property Type</dt>
                          <dd className="font-medium text-[#202A24] mt-0.5">{c.propertyType}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-[#758078]">Completed Services</dt>
                          <dd className="font-mono font-semibold text-[#123C2A] mt-0.5">
                            {c.completedCount}
                          </dd>
                        </div>
                        {c.notes && (
                          <div className="col-span-2">
                            <dt className="text-[11px] text-[#758078]">Site Notes</dt>
                            <dd className="text-[#202A24] mt-0.5 break-words">{c.notes}</dd>
                          </div>
                        )}
                      </dl>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#E6EAE5] flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCardExpand(c.id)}
                      aria-expanded={isExpanded}
                      className="inline-flex items-center justify-center gap-1 min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium text-[#758078] bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg hover:text-[#202A24] shrink-0"
                    >
                      <span>{isExpanded ? 'Less' : 'Details'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <Link
                      to={`/customers/${c.id}`}
                      className="flex-1 inline-flex items-center justify-center min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium text-[#123C2A] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#DCE8DF] transition-colors"
                    >
                      View Profile
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="bg-white border border-[#E6EAE5] rounded-xl px-4 py-3">
            <Pagination
              currentPage={page}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E6EAE5] bg-[#F7F6F0]/70 text-[11px] font-semibold text-[#758078] uppercase tracking-wider">
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Property Type</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Total Requests</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAE5] text-xs">
                {paginated.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F7F6F0]/60 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#202A24]">
                      <Link to={`/customers/${c.id}`} className="hover:text-[#123C2A] hover:underline">
                        {c.fullName}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                      {isCallablePhone(c.phone) ? (
                        <a
                          href={toTelHref(c.phone)}
                          className="inline-flex items-center gap-1.5 font-medium text-[#123C2A] hover:underline"
                          title={`Call ${c.fullName}`}
                        >
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>{c.phone}</span>
                        </a>
                      ) : (
                        <span className="text-[#758078]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#202A24] whitespace-nowrap">
                      {c.subcityName} · {c.neighbourhoodName}
                    </td>
                    <td className="py-3.5 px-4 text-[#758078] whitespace-nowrap">{c.propertyType}</td>
                    <td className="py-3.5 px-4 font-mono text-[#758078] whitespace-nowrap">
                      {formatDate(c.registeredAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-medium text-[#202A24]">
                      {c.totalRequests}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/customers/${c.id}`}
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
      )}
    </div>
  );
}
