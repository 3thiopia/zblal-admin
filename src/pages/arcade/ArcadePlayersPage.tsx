import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Gamepad2,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import { useArcade } from '../../context/ArcadeContext';
import { ArcadeSubnav } from '../../components/arcade/ArcadeSubnav';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { ViewModeToggle } from '../../components/ui/ViewModeToggle';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useResponsiveViewMode } from '../../hooks/useResponsiveViewMode';
import { computePlayerSummaries } from '../../utils/arcadeScoring';
import { formatAddisDate, formatAddisDateTime } from '../../utils/arcadeTime';
import { isCallablePhone, toTelHref } from '../../utils/formatters';
import { ArcadePlayer } from '../../types/arcade';

const PAGE_SIZE = 8;

export function ArcadePlayersPage() {
  const { players, games, sessions, scores, togglePlayerStatus } = useArcade();
  const [viewMode, setViewMode] = useResponsiveViewMode('arcade_players');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Suspended'>('all');
  const [page, setPage] = useState(1);
  const [confirmTarget, setConfirmTarget] = useState<ArcadePlayer | null>(null);

  const summaryMap = useMemo(
    () => computePlayerSummaries({ players, games, sessions, scores }),
    [players, games, sessions, scores]
  );

  const enriched = useMemo(
    () =>
      players.map((p) => ({
        player: p,
        summary: summaryMap.get(p.id) ?? {
          totalGamesPlayed: 0,
          validScoresCount: 0,
          highestScore: 0,
          mostPlayedGameName: '—',
          lastActivityAt: p.registeredAt,
        },
      })),
    [players, summaryMap]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter(({ player }) => {
      if (statusFilter !== 'all' && player.status !== statusFilter) return false;
      if (q) {
        const hit =
          player.nickname.toLowerCase().includes(q) ||
          player.phone_e164.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [enriched, search, statusFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#202A24]">Arcade Players</h2>
          <p className="text-xs text-[#758078] mt-0.5">
            Registered players from <span className="font-mono">public.arcade_players</span>. Suspending preserves all historical scores.
          </p>
        </div>

        <ViewModeToggle
          value={viewMode}
          onChange={setViewMode}
          className="self-start sm:self-auto"
        />
      </div>

      <ArcadeSubnav />

      <div className="bg-white border border-[#E6EAE5] rounded-xl p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-[#758078] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by nickname or phone number..."
            className="w-full min-h-[44px] sm:min-h-[38px] pl-9 pr-3 py-2 text-xs bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg focus:outline-none focus:bg-white focus:border-[#123C2A]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'all' | 'Active' | 'Suspended');
            setPage(1);
          }}
          aria-label="Filter by player status"
          className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-xs bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
        >
          <option value="all">All player statuses ({players.length})</option>
          <option value="Active">
            Active ({players.filter((p) => p.status === 'Active').length})
          </option>
          <option value="Suspended">
            Suspended ({players.filter((p) => p.status === 'Suspended').length})
          </option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={players.length === 0 ? 'No arcade players registered yet' : 'No matching players'}
          description={
            players.length === 0
              ? 'Players who register via the arcade website will appear here automatically.'
              : 'Try clearing your search or status filter.'
          }
          action={
            players.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
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
            {paginated.map(({ player, summary }) => {
              const callable = isCallablePhone(player.phone_e164);
              return (
                <article
                  key={player.id}
                  className="bg-white border border-[#E6EAE5] rounded-xl p-4 flex flex-col justify-between gap-3 shadow-[0_1px_2px_rgba(18,60,42,0.03)] min-w-0"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={`/arcade/players/${player.id}`}
                          className="text-base font-semibold text-[#202A24] hover:text-[#123C2A] hover:underline block truncate"
                        >
                          {player.nickname}
                        </Link>
                        {callable ? (
                          <a
                            href={toTelHref(player.phone_e164)}
                            className="inline-flex items-center gap-1 text-xs font-mono font-medium text-[#123C2A] hover:underline mt-0.5 break-all"
                          >
                            <Phone className="w-3 h-3 shrink-0" />
                            <span>{player.phone_e164}</span>
                          </a>
                        ) : (
                          <p className="text-xs font-mono text-[#758078] mt-0.5">No phone on file</p>
                        )}
                      </div>
                      <StatusBadge status={player.status} />
                    </div>

                    <dl className="grid grid-cols-2 gap-2.5 p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg text-xs">
                      <div>
                        <dt className="text-[11px] text-[#758078]">Games Played</dt>
                        <dd className="font-mono font-semibold text-[#202A24] tabular-nums mt-0.5">
                          {summary.totalGamesPlayed}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-[#758078]">Highest Score</dt>
                        <dd className="font-mono font-semibold text-[#123C2A] tabular-nums mt-0.5">
                          {summary.highestScore.toLocaleString()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-[#758078]">Most Played Game</dt>
                        <dd className="font-medium text-[#202A24] truncate mt-0.5">
                          {summary.mostPlayedGameName}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-[#758078]">Last Activity</dt>
                        <dd className="text-[#202A24] truncate mt-0.5">
                          {summary.lastActivityAt
                            ? formatAddisDate(summary.lastActivityAt)
                            : '—'}
                        </dd>
                      </div>
                    </dl>

                    <p className="text-[11px] text-[#758078] inline-flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>Registered {formatAddisDate(player.registeredAt)}</span>
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-[#E6EAE5] flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmTarget(player)}
                      className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium rounded-lg border transition-colors shrink-0 ${
                        player.status === 'Active'
                          ? 'text-[#991B1B] bg-[#FEE2E2]/50 border-[#FECACA] hover:bg-[#FEE2E2]'
                          : 'text-[#123C2A] bg-[#DCE8DF]/60 border-[#C3D9C9] hover:bg-[#DCE8DF]'
                      }`}
                    >
                      {player.status === 'Active' ? (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Suspend</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Reactivate</span>
                        </>
                      )}
                    </button>

                    <Link
                      to={`/arcade/players/${player.id}`}
                      className="flex-1 inline-flex items-center justify-center min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium text-[#123C2A] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#DCE8DF]/60 transition-colors"
                    >
                      View Player Details
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
                  <th className="py-3 px-4">Player Nickname</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Games Played</th>
                  <th className="py-3 px-4 text-right">Highest Score</th>
                  <th className="py-3 px-4">Most Played Game</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAE5] text-xs">
                {paginated.map(({ player, summary }) => (
                  <tr key={player.id} className="hover:bg-[#F7F6F0]/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[#202A24]">
                      <Link
                        to={`/arcade/players/${player.id}`}
                        className="hover:text-[#123C2A] hover:underline"
                      >
                        {player.nickname}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                      {isCallablePhone(player.phone_e164) ? (
                        <a
                          href={toTelHref(player.phone_e164)}
                          className="text-[#123C2A] hover:underline"
                        >
                          {player.phone_e164}
                        </a>
                      ) : (
                        <span className="text-[#758078]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#758078] whitespace-nowrap">
                      {formatAddisDate(player.registeredAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={player.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#202A24]">
                      <span className="inline-flex items-center gap-1">
                        <Gamepad2 className="w-3.5 h-3.5 text-[#758078]" />
                        {summary.totalGamesPlayed}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#123C2A]">
                      <span className="inline-flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-[#123C2A]" />
                        {summary.highestScore.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#202A24] whitespace-nowrap">
                      {summary.mostPlayedGameName}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#758078] whitespace-nowrap">
                      {summary.lastActivityAt ? formatAddisDateTime(summary.lastActivityAt) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmTarget(player)}
                          className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border ${
                            player.status === 'Active'
                              ? 'text-[#991B1B] border-[#FECACA] hover:bg-[#FEE2E2]/50'
                              : 'text-[#123C2A] border-[#C3D9C9] hover:bg-[#DCE8DF]/60'
                          }`}
                        >
                          {player.status === 'Active' ? 'Suspend' : 'Reactivate'}
                        </button>
                        <Link
                          to={`/arcade/players/${player.id}`}
                          className="px-3 py-1.5 text-xs font-medium text-[#123C2A] bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg hover:bg-[#DCE8DF]"
                        >
                          Details
                        </Link>
                      </div>
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

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (!confirmTarget) return;
          const next = confirmTarget.status === 'Active' ? 'Suspended' : 'Active';
          void togglePlayerStatus(confirmTarget.id, next);
        }}
        title={
          confirmTarget?.status === 'Active'
            ? `Suspend ${confirmTarget.nickname}?`
            : `Reactivate ${confirmTarget?.nickname}?`
        }
        description={
          confirmTarget?.status === 'Active'
            ? 'The player will be marked Suspended in public.arcade_players. All historical scores and sessions remain intact and are never deleted.'
            : 'The player will be restored to Active status in public.arcade_players.'
        }
        confirmLabel={confirmTarget?.status === 'Active' ? 'Suspend Player' : 'Reactivate Player'}
        tone={confirmTarget?.status === 'Active' ? 'danger' : 'primary'}
      />
    </div>
  );
}
