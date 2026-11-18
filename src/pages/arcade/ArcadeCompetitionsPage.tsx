import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  Edit3,
  PauseCircle,
  PlayCircle,
  Plus,
  Trophy,
  XCircle,
} from 'lucide-react';
import { useArcade } from '../../context/ArcadeContext';
import { ArcadeSubnav } from '../../components/arcade/ArcadeSubnav';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ViewModeToggle } from '../../components/ui/ViewModeToggle';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CompetitionFormModal } from '../../components/arcade/CompetitionFormModal';
import { CompetitionStandingsModal } from '../../components/arcade/CompetitionStandingsModal';
import { useResponsiveViewMode } from '../../hooks/useResponsiveViewMode';
import {
  ArcadeCompetition,
  ArcadeCompetitionStatus,
  ArcadeCompetitionType,
} from '../../types/arcade';
import { formatAddisDateTime } from '../../utils/arcadeTime';

export function ArcadeCompetitionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { competitions, competitionGames, games, changeCompetitionStatus } = useArcade();
  const [viewMode, setViewMode] = useResponsiveViewMode('arcade_competitions');

  const [typeFilter, setTypeFilter] = useState<'all' | ArcadeCompetitionType>(() => {
    const t = searchParams.get('type');
    return t === 'daily' || t === 'weekly' ? t : 'all';
  });
  const [statusBucket, setStatusBucket] = useState<'all' | 'live' | 'upcoming' | 'historical'>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<ArcadeCompetition | null>(null);
  const [defaultCreateType, setDefaultCreateType] = useState<ArcadeCompetitionType>('daily');
  const [standingsComp, setStandingsComp] = useState<ArcadeCompetition | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    competition: ArcadeCompetition;
    nextStatus: ArcadeCompetitionStatus;
  } | null>(null);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingComp(null);
      setDefaultCreateType('daily');
      setFormOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const gameMap = useMemo(() => new Map(games.map((g) => [g.id, g])), [games]);

  const filtered = useMemo(() => {
    return competitions.filter((c) => {
      if (typeFilter !== 'all' && c.competitionType !== typeFilter) return false;
      if (statusBucket === 'live' && c.status !== 'Active') return false;
      if (
        statusBucket === 'upcoming' &&
        c.status !== 'Upcoming' &&
        c.status !== 'Draft' &&
        c.status !== 'Paused'
      ) {
        return false;
      }
      if (
        statusBucket === 'historical' &&
        c.status !== 'Completed' &&
        c.status !== 'Cancelled'
      ) {
        return false;
      }
      return true;
    });
  }, [competitions, typeFilter, statusBucket]);

  const getAttachedGames = (compId: string) =>
    competitionGames
      .filter((cg) => cg.competitionId === compId)
      .map((cg) => gameMap.get(cg.gameId))
      .filter((g): g is NonNullable<typeof g> => Boolean(g));

  const openCreateModal = (type: ArcadeCompetitionType) => {
    setEditingComp(null);
    setDefaultCreateType(type);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#202A24]">Arcade Competitions</h2>
          <p className="text-xs text-[#758078] mt-0.5">
            Manage daily and weekly competitions stored in <span className="font-mono">public.arcade_competitions</span> and <span className="font-mono">public.arcade_competition_games</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <button
            type="button"
            onClick={() => openCreateModal('daily')}
            className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-3.5 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Daily</span>
          </button>
          <button
            type="button"
            onClick={() => openCreateModal('weekly')}
            className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-3.5 py-2 text-xs font-medium text-[#123C2A] bg-white border border-[#123C2A]/30 rounded-lg hover:bg-[#DCE8DF]/50 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Weekly</span>
          </button>
        </div>
      </div>

      <ArcadeSubnav />

      {/* Filters */}
      <div className="bg-white border border-[#E6EAE5] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg overflow-x-auto">
          {(
            [
              { id: 'all', label: `All (${competitions.length})` },
              {
                id: 'live',
                label: `Live (${competitions.filter((c) => c.status === 'Active').length})`,
              },
              {
                id: 'upcoming',
                label: `Paused / Upcoming (${
                  competitions.filter(
                    (c) => c.status === 'Upcoming' || c.status === 'Paused' || c.status === 'Draft'
                  ).length
                })`,
              },
              {
                id: 'historical',
                label: `Historical (${
                  competitions.filter(
                    (c) => c.status === 'Completed' || c.status === 'Cancelled'
                  ).length
                })`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusBucket(tab.id)}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                statusBucket === tab.id
                  ? 'bg-white text-[#123C2A] shadow-xs font-semibold'
                  : 'text-[#5C665F] hover:text-[#202A24]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | ArcadeCompetitionType)}
          aria-label="Filter by competition type"
          className="min-h-[44px] sm:min-h-[38px] px-3 py-2 text-xs bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
        >
          <option value="all">All types (Daily &amp; Weekly)</option>
          <option value="daily">Daily Competitions</option>
          <option value="weekly">Weekly Competitions</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={
            competitions.length === 0
              ? 'No arcade competitions created yet'
              : 'No competitions match your filter'
          }
          description={
            competitions.length === 0
              ? 'Create a daily or weekly competition to start tracking live standings and prizes.'
              : 'Try switching status tabs or clearing the competition type filter.'
          }
          action={
            <button
              type="button"
              onClick={() => openCreateModal('daily')}
              className="min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg"
            >
              Create First Competition
            </button>
          }
        />
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((comp) => {
            const attachedGames = getAttachedGames(comp.id);
            return (
              <article
                key={comp.id}
                className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-[0_1px_2px_rgba(18,60,42,0.03)]"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-[#5C665F]">
                        <span className="uppercase tracking-wider font-mono">
                          {comp.competitionType}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {attachedGames.length} game{attachedGames.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-[#202A24] mt-1 break-words">
                        {comp.name}
                      </h3>
                    </div>
                    <StatusBadge status={comp.status} />
                  </div>

                  <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg text-xs space-y-1.5">
                    <p className="inline-flex items-center gap-1.5 font-mono text-[#202A24]">
                      <CalendarDays className="w-3.5 h-3.5 text-[#123C2A] shrink-0" />
                      <span>
                        {formatAddisDateTime(comp.startsAt)} → {formatAddisDateTime(comp.endsAt)}
                      </span>
                    </p>
                    {comp.prizeDescription && (
                      <p className="text-[#5C665F] leading-relaxed">
                        <strong className="text-[#202A24]">Prize:</strong> {comp.prizeDescription}
                      </p>
                    )}
                  </div>

                  {attachedGames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {attachedGames.map((g) => (
                        <span
                          key={g.id}
                          className="px-2 py-0.5 text-[11px] bg-[#F7F6F0] border border-[#E6EAE5] rounded text-[#202A24]"
                        >
                          {g.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#E6EAE5] flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStandingsComp(comp)}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[36px] px-3 py-1.5 text-xs font-semibold text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21]"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Live Standings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingComp(comp);
                      setFormOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[36px] px-3 py-1.5 text-xs font-medium text-[#202A24] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  {comp.status !== 'Active' &&
                    comp.status !== 'Completed' &&
                    comp.status !== 'Cancelled' && (
                      <button
                        type="button"
                        onClick={() => void changeCompetitionStatus(comp.id, 'Active')}
                        className="inline-flex items-center gap-1 min-h-[40px] sm:min-h-[36px] px-3 py-1.5 text-xs font-medium text-[#123C2A] bg-[#DCE8DF] border border-[#C3D9C9] rounded-lg hover:bg-[#C3D9C9]/70"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Activate</span>
                      </button>
                    )}

                  {comp.status === 'Active' && (
                    <button
                      type="button"
                      onClick={() => void changeCompetitionStatus(comp.id, 'Paused')}
                      className="inline-flex items-center gap-1 min-h-[40px] sm:min-h-[36px] px-3 py-1.5 text-xs font-medium text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] rounded-lg hover:bg-[#FDE68A]/70"
                    >
                      <PauseCircle className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </button>
                  )}

                  {(comp.status === 'Active' || comp.status === 'Paused') && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmAction({ competition: comp, nextStatus: 'Completed' })
                        }
                        className="inline-flex items-center gap-1 min-h-[40px] sm:min-h-[36px] px-3 py-1.5 text-xs font-medium text-[#123C2A] bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg hover:bg-[#DCE8DF]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmAction({ competition: comp, nextStatus: 'Cancelled' })
                        }
                        className="inline-flex items-center gap-1 min-h-[40px] sm:min-h-[36px] px-3 py-1.5 text-xs font-medium text-[#991B1B] bg-[#FEE2E2]/50 border border-[#FECACA] rounded-lg hover:bg-[#FEE2E2]"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E6EAE5] bg-[#F7F6F0]/70 text-[11px] font-semibold text-[#758078] uppercase tracking-wider">
                  <th className="py-3 px-4">Competition</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Window (Addis Ababa)</th>
                  <th className="py-3 px-4">Games</th>
                  <th className="py-3 px-4">Prize</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAE5] text-xs">
                {filtered.map((comp) => {
                  const attached = getAttachedGames(comp.id);
                  return (
                    <tr key={comp.id} className="hover:bg-[#F7F6F0]/60">
                      <td className="py-3.5 px-4 font-semibold text-[#202A24]">{comp.name}</td>
                      <td className="py-3.5 px-4 font-mono uppercase text-[#5C665F]">
                        {comp.competitionType}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#758078] whitespace-nowrap">
                        {formatAddisDateTime(comp.startsAt)} – {formatAddisDateTime(comp.endsAt)}
                      </td>
                      <td className="py-3.5 px-4 text-[#202A24]">
                        {attached.map((g) => g.name).join(', ') || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-[#5C665F] max-w-[220px] truncate">
                        {comp.prizeDescription || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={comp.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setStandingsComp(comp)}
                            className="px-2.5 py-1.5 text-xs font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21]"
                          >
                            Standings
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingComp(comp);
                              setFormOpen(true);
                            }}
                            className="px-2.5 py-1.5 text-xs font-medium text-[#202A24] bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg hover:bg-[#DCE8DF]"
                          >
                            Edit
                          </button>
                          {comp.status === 'Active' ? (
                            <button
                              type="button"
                              onClick={() => void changeCompetitionStatus(comp.id, 'Paused')}
                              className="px-2.5 py-1.5 text-xs font-medium text-[#92400E] bg-[#FEF3C7] rounded-lg"
                            >
                              Pause
                            </button>
                          ) : comp.status !== 'Completed' && comp.status !== 'Cancelled' ? (
                            <button
                              type="button"
                              onClick={() => void changeCompetitionStatus(comp.id, 'Active')}
                              className="px-2.5 py-1.5 text-xs font-medium text-[#123C2A] bg-[#DCE8DF] rounded-lg"
                            >
                              Activate
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CompetitionFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingComp(null);
        }}
        competition={editingComp}
        defaultType={defaultCreateType}
      />

      <CompetitionStandingsModal
        open={Boolean(standingsComp)}
        onClose={() => setStandingsComp(null)}
        competition={standingsComp}
      />

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) return;
          void changeCompetitionStatus(confirmAction.competition.id, confirmAction.nextStatus);
        }}
        title={
          confirmAction?.nextStatus === 'Completed'
            ? `Complete "${confirmAction.competition.name}"?`
            : `Cancel "${confirmAction?.competition.name}"?`
        }
        description={
          confirmAction?.nextStatus === 'Completed'
            ? 'This marks the competition as Completed in public.arcade_competitions. You can then review and approve winners in Winners & Rewards.'
            : 'This cancels the competition in public.arcade_competitions. Existing valid player scores remain preserved.'
        }
        confirmLabel={
          confirmAction?.nextStatus === 'Completed' ? 'Mark Completed' : 'Cancel Competition'
        }
        tone={confirmAction?.nextStatus === 'Cancelled' ? 'danger' : 'primary'}
      />
    </div>
  );
}
