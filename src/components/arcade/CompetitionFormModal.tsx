import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useArcade } from '../../context/ArcadeContext';
import {
  ArcadeCompetition,
  ArcadeCompetitionStatus,
  ArcadeCompetitionType,
} from '../../types/arcade';
import {
  buildAddisRangeFromDateInputs,
  getAddisDayBounds,
  getAddisWeekBounds,
  toAddisDateInputValue,
  toInclusiveAddisEndDateInput,
} from '../../utils/arcadeTime';

interface CompetitionFormModalProps {
  open: boolean;
  onClose: () => void;
  competition?: ArcadeCompetition | null;
  defaultType?: ArcadeCompetitionType;
}

const COMP_STATUSES: ArcadeCompetitionStatus[] = [
  'Draft',
  'Upcoming',
  'Active',
  'Paused',
  'Completed',
  'Cancelled',
];

export function CompetitionFormModal({
  open,
  onClose,
  competition,
  defaultType = 'daily',
}: CompetitionFormModalProps) {
  const { games, competitionGames, saveCompetition } = useArcade();

  const [name, setName] = useState('');
  const [competitionType, setCompetitionType] = useState<ArcadeCompetitionType>(defaultType);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<ArcadeCompetitionStatus>('Active');
  const [prizeDescription, setPrizeDescription] = useState('');
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const applyPeriodPreset = (type: ArcadeCompetitionType, offset: 0 | 1) => {
    setCompetitionType(type);
    if (type === 'daily') {
      const bounds = getAddisDayBounds(new Date(), offset);
      setStartDate(bounds.label);
      setEndDate(bounds.label);
    } else {
      const bounds = getAddisWeekBounds(new Date(), offset);
      const startYmd = toAddisDateInputValue(bounds.startIso);
      const endYmd = toInclusiveAddisEndDateInput(bounds.endIso);
      setStartDate(startYmd);
      setEndDate(endYmd);
    }
  };

  useEffect(() => {
    if (!open) return;
    setError('');
    setSaving(false);

    if (competition) {
      setName(competition.name);
      setCompetitionType(competition.competitionType);
      setStartDate(toAddisDateInputValue(competition.startsAt));
      setEndDate(toInclusiveAddisEndDateInput(competition.endsAt));
      setStatus(competition.status);
      setPrizeDescription(competition.prizeDescription);
      const attached = competitionGames
        .filter((cg) => cg.competitionId === competition.id)
        .map((cg) => cg.gameId);
      setSelectedGameIds(attached);
    } else {
      setName('');
      setStatus('Active');
      setPrizeDescription('');
      applyPeriodPreset(defaultType, 0);
      setSelectedGameIds(games.filter((g) => g.isActive && !g.isComingSoon).map((g) => g.id));
    }
  }, [open, competition, competitionGames, defaultType, games]);

  const toggleGame = (gameId: string) => {
    setSelectedGameIds((prev) =>
      prev.includes(gameId) ? prev.filter((id) => id !== gameId) : [...prev, gameId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!name.trim()) {
      setError('Competition name is required.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start and end dates are required.');
      return;
    }
    if (endDate < startDate) {
      setError('End date must be on or after the start date.');
      return;
    }
    if (selectedGameIds.length === 0) {
      setError('Select at least one participating game.');
      return;
    }

    const { startsAt, endsAt } = buildAddisRangeFromDateInputs(startDate, endDate);

    setError('');
    setSaving(true);
    try {
      await saveCompetition({
        id: competition?.id,
        name: name.trim(),
        competitionType,
        startsAt,
        endsAt,
        status,
        prizeDescription: prizeDescription.trim(),
        gameIds: selectedGameIds,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save competition.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={competition ? `Edit Competition — ${competition.name}` : 'Create Arcade Competition'}
      subtitle="Competition windows run from 00:00 Addis Ababa local time on the start date through 24:00 on the end date."
      size="lg"
      footer={
        <>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#202A24] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="competition-form"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{saving ? 'Saving...' : competition ? 'Save Changes' : 'Create Competition'}</span>
          </button>
        </>
      }
    >
      <form id="competition-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="p-3 text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-lg"
          >
            {error}
          </div>
        )}

        <div>
          <label htmlFor="comp-name" className="block text-xs font-medium text-[#202A24] mb-1">
            Competition Name <span className="text-[#B91C1C]">*</span>
          </label>
          <input
            id="comp-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            placeholder="e.g. Addis Daily Sprint — Nov 18"
            className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
          />
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#202A24]">Addis Ababa Quick Presets</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyPeriodPreset('daily', 0)}
                className="px-2.5 py-1 text-[11px] font-medium bg-[#F7F6F0] border border-[#E6EAE5] rounded-md hover:bg-[#DCE8DF]/60 text-[#123C2A]"
              >
                Today (Daily)
              </button>
              <button
                type="button"
                onClick={() => applyPeriodPreset('daily', 1)}
                className="px-2.5 py-1 text-[11px] font-medium bg-[#F7F6F0] border border-[#E6EAE5] rounded-md hover:bg-[#DCE8DF]/60 text-[#123C2A]"
              >
                Tomorrow (Daily)
              </button>
              <button
                type="button"
                onClick={() => applyPeriodPreset('weekly', 0)}
                className="px-2.5 py-1 text-[11px] font-medium bg-[#F7F6F0] border border-[#E6EAE5] rounded-md hover:bg-[#DCE8DF]/60 text-[#123C2A]"
              >
                This Week (Mon–Sun)
              </button>
              <button
                type="button"
                onClick={() => applyPeriodPreset('weekly', 1)}
                className="px-2.5 py-1 text-[11px] font-medium bg-[#F7F6F0] border border-[#E6EAE5] rounded-md hover:bg-[#DCE8DF]/60 text-[#123C2A]"
              >
                Next Week (Mon–Sun)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="comp-type" className="block text-xs font-medium text-[#202A24] mb-1">
                Competition Type
              </label>
              <select
                id="comp-type"
                value={competitionType}
                onChange={(e) => setCompetitionType(e.target.value as ArcadeCompetitionType)}
                disabled={saving}
                className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
              >
                <option value="daily">Daily Competition</option>
                <option value="weekly">Weekly Competition</option>
              </select>
            </div>

            <div>
              <label htmlFor="comp-status" className="block text-xs font-medium text-[#202A24] mb-1">
                Status
              </label>
              <select
                id="comp-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ArcadeCompetitionStatus)}
                disabled={saving}
                className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
              >
                {COMP_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="comp-start" className="block text-xs font-medium text-[#202A24] mb-1">
                Start Date (Addis Ababa) <span className="text-[#B91C1C]">*</span>
              </label>
              <input
                id="comp-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={saving}
                className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm font-mono bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
              />
            </div>

            <div>
              <label htmlFor="comp-end" className="block text-xs font-medium text-[#202A24] mb-1">
                End Date (Addis Ababa) <span className="text-[#B91C1C]">*</span>
              </label>
              <input
                id="comp-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={saving}
                className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm font-mono bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="comp-prize" className="block text-xs font-medium text-[#202A24] mb-1">
            Prize Description
          </label>
          <textarea
            id="comp-prize"
            rows={2}
            value={prizeDescription}
            onChange={(e) => setPrizeDescription(e.target.value)}
            disabled={saving}
            placeholder="e.g. 500 ETB mobile airtime + 15% service voucher for 1st place overall"
            className="w-full px-3 py-2 text-sm bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-[#202A24]">
              Participating Games ({selectedGameIds.length} selected) <span className="text-[#B91C1C]">*</span>
            </span>
            <button
              type="button"
              onClick={() =>
                setSelectedGameIds(
                  selectedGameIds.length === games.length ? [] : games.map((g) => g.id)
                )
              }
              className="text-[11px] font-medium text-[#123C2A] hover:underline"
            >
              {selectedGameIds.length === games.length ? 'Clear all' : 'Select all'}
            </button>
          </div>
          {games.length === 0 ? (
            <p className="text-xs text-[#758078] p-3 bg-[#F7F6F0] rounded-lg border border-[#E6EAE5]">
              No games found in public.arcade_games.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {games.map((g) => {
                const checked = selectedGameIds.includes(g.id);
                return (
                  <label
                    key={g.id}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'bg-[#DCE8DF]/50 border-[#123C2A]/40 text-[#123C2A]'
                        : 'bg-white border-[#E6EAE5] text-[#202A24] hover:bg-[#F7F6F0]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{g.name}</p>
                      <p className="text-[11px] text-[#758078] truncate">
                        {g.isComingSoon ? 'Coming Soon' : g.isActive ? 'Active' : 'Disabled'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleGame(g.id)}
                      disabled={saving}
                      className="h-4 w-4 accent-[#123C2A] shrink-0"
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
