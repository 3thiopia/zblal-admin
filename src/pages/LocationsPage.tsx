import React, { useMemo, useState } from 'react';
import { Plus, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';

export function LocationsPage() {
  const {
    subcities,
    neighbourhoods,
    toggleSubcityActive,
    toggleNeighbourhoodActive,
    addSubcity,
    addNeighbourhood,
  } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const [subcityModalOpen, setSubcityModalOpen] = useState(false);
  const [newSubEn, setNewSubEn] = useState('');
  const [newSubAm, setNewSubAm] = useState('');

  const [nbModalSubcityId, setNbModalSubcityId] = useState<string | null>(null);
  const [newNbEn, setNewNbEn] = useState('');
  const [newNbAm, setNewNbAm] = useState('');

  const toggleExpand = (id: string) => {
    setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredSubcities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subcities.filter((sc) => {
      if (statusFilter === 'active' && !sc.active) return false;
      if (statusFilter === 'inactive' && sc.active) return false;

      if (!q) return true;
      const scMatch =
        sc.nameEn.toLowerCase().includes(q) || sc.nameAm.toLowerCase().includes(q);
      const childMatch = neighbourhoods.some(
        (nb) =>
          nb.subcityId === sc.id &&
          (nb.nameEn.toLowerCase().includes(q) || nb.nameAm.toLowerCase().includes(q))
      );
      return scMatch || childMatch;
    });
  }, [subcities, neighbourhoods, search, statusFilter]);

  const handleAddSubcity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubEn.trim() || !newSubAm.trim()) return;
    setBusy(true);
    try {
      await addSubcity(newSubEn, newSubAm);
      setNewSubEn('');
      setNewSubAm('');
      setSubcityModalOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleAddNeighbourhood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nbModalSubcityId || !newNbEn.trim() || !newNbAm.trim()) return;
    setBusy(true);
    try {
      await addNeighbourhood(nbModalSubcityId, newNbEn, newNbAm);
      setNewNbEn('');
      setNewNbAm('');
      setNbModalSubcityId(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[#202A24]">
            Service Locations (Subcities & Neighbourhoods)
          </h2>
          <p className="text-xs text-[#758078] mt-0.5">
            Parent-child service coverage managed in Supabase subcities and locations tables.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSubcityModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] whitespace-nowrap shrink-0 w-full sm:w-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Subcity
        </button>
      </div>

      <div className="bg-white border border-[#E6EAE5] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-[#758078] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search English or Amharic subcity / neighbourhood..."
            className="w-full min-h-[44px] sm:min-h-[36px] pl-9 pr-3 py-2 text-xs bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg focus:outline-none focus:bg-white focus:border-[#123C2A]"
          />
        </div>

        <div className="grid grid-cols-3 sm:inline-flex items-center p-1 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg w-full sm:w-auto shrink-0">
          {(['all', 'active', 'inactive'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`min-h-[40px] sm:min-h-[30px] px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-white text-[#123C2A] shadow-sm'
                  : 'text-[#758078] hover:text-[#202A24]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {filteredSubcities.length === 0 ? (
        <EmptyState
          title={subcities.length === 0 ? 'No subcities in Supabase yet' : 'No matching locations'}
          description={
            subcities.length === 0
              ? 'Add your first subcity and neighbourhood locations.'
              : 'Adjust your search or status filter.'
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredSubcities.map((sc) => {
            const children = neighbourhoods.filter((nb) => {
              if (nb.subcityId !== sc.id) return false;
              if (statusFilter === 'active' && !nb.active) return false;
              if (statusFilter === 'inactive' && nb.active) return false;
              const q = search.trim().toLowerCase();
              if (q) {
                const scMatch =
                  sc.nameEn.toLowerCase().includes(q) || sc.nameAm.toLowerCase().includes(q);
                if (!scMatch) {
                  return (
                    nb.nameEn.toLowerCase().includes(q) || nb.nameAm.toLowerCase().includes(q)
                  );
                }
              }
              return true;
            });

            const isExpanded = !collapsedIds[sc.id];

            return (
              <section
                key={sc.id}
                className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden"
              >
                <div className="px-4 sm:px-5 py-3.5 bg-[#F7F6F0]/60 border-b border-[#E6EAE5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleExpand(sc.id)}
                    className="flex items-center gap-2.5 text-left min-w-0 min-h-[44px] sm:min-h-0 flex-1"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-[#758078] shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#758078] shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[#202A24]">{sc.nameEn}</span>
                        <span className="text-sm text-[#758078]">{sc.nameAm}</span>
                        <StatusBadge status={sc.active ? 'Active' : 'Inactive'} />
                      </div>
                      <p className="text-[11px] text-[#758078] mt-0.5 tabular-nums">
                        {children.length} location(s)
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setNbModalSubcityId(sc.id)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 min-h-[44px] sm:min-h-[34px] px-3 py-1.5 text-xs font-medium text-[#123C2A] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#DCE8DF]/60"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Location
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleSubcityActive(sc.id)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center min-h-[44px] sm:min-h-[34px] px-3 py-1.5 text-xs font-medium text-[#202A24] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0] disabled:opacity-50"
                    >
                      {sc.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="divide-y divide-[#E6EAE5]">
                    {children.length === 0 ? (
                      <p className="px-4 sm:px-5 py-4 text-xs text-[#758078]">
                        No locations listed under this filter.
                      </p>
                    ) : (
                      children.map((nb) => (
                        <div
                          key={nb.id}
                          className="px-4 sm:px-5 py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-4 hover:bg-[#F7F6F0]/40"
                        >
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                            <span className="text-xs font-medium text-[#202A24]">{nb.nameEn}</span>
                            <span aria-hidden="true" className="text-[#758078]">·</span>
                            <span className="text-xs text-[#758078]">{nb.nameAm}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-auto">
                            <StatusBadge status={nb.active ? 'Active' : 'Inactive'} />
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void toggleNeighbourhoodActive(nb.id)}
                              className="inline-flex items-center justify-center min-h-[40px] sm:min-h-[30px] px-3 py-1.5 text-xs sm:text-[11px] font-medium text-[#202A24] bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg sm:rounded-md hover:bg-[#DCE8DF]/50 disabled:opacity-50"
                            >
                              {nb.active ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Add Subcity Modal */}
      <Modal
        open={subcityModalOpen}
        onClose={() => setSubcityModalOpen(false)}
        title="Add Subcity"
        size="md"
        footer={
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => setSubcityModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-[#202A24] bg-white border border-[#E6EAE5] rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-subcity-form"
              disabled={busy}
              className="px-4 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg disabled:opacity-50"
            >
              {busy ? 'Saving...' : 'Add Subcity'}
            </button>
          </>
        }
      >
        <form id="add-subcity-form" onSubmit={handleAddSubcity} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#202A24] mb-1">
              English Name <span className="text-[#B91C1C]">*</span>
            </label>
            <input
              type="text"
              required
              value={newSubEn}
              onChange={(e) => setNewSubEn(e.target.value)}
              placeholder="e.g. Gullele"
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202A24] mb-1">
              Amharic Name <span className="text-[#B91C1C]">*</span>
            </label>
            <input
              type="text"
              required
              value={newSubAm}
              onChange={(e) => setNewSubAm(e.target.value)}
              placeholder="e.g. ጉለሌ"
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            />
          </div>
        </form>
      </Modal>

      {/* Add Neighbourhood Modal */}
      <Modal
        open={Boolean(nbModalSubcityId)}
        onClose={() => setNbModalSubcityId(null)}
        title="Add Location"
        subtitle={
          nbModalSubcityId
            ? `Under ${subcities.find((s) => s.id === nbModalSubcityId)?.nameEn ?? ''}`
            : undefined
        }
        size="md"
        footer={
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => setNbModalSubcityId(null)}
              className="px-4 py-2 text-xs font-medium text-[#202A24] bg-white border border-[#E6EAE5] rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-nb-form"
              disabled={busy}
              className="px-4 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg disabled:opacity-50"
            >
              {busy ? 'Saving...' : 'Add Location'}
            </button>
          </>
        }
      >
        <form id="add-nb-form" onSubmit={handleAddNeighbourhood} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#202A24] mb-1">
              English Name <span className="text-[#B91C1C]">*</span>
            </label>
            <input
              type="text"
              required
              value={newNbEn}
              onChange={(e) => setNewNbEn(e.target.value)}
              placeholder="e.g. Shiromeda"
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202A24] mb-1">
              Amharic Name <span className="text-[#B91C1C]">*</span>
            </label>
            <input
              type="text"
              required
              value={newNbAm}
              onChange={(e) => setNewNbAm(e.target.value)}
              placeholder="e.g. ሽሮ ሜዳ"
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
