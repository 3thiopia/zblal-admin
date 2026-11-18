import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, CheckCircle2, FileText, Info, XCircle } from 'lucide-react';
import { useArcade } from '../../context/ArcadeContext';
import { ArcadeSubnav } from '../../components/arcade/ArcadeSubnav';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { ViewModeToggle } from '../../components/ui/ViewModeToggle';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { WinnerActionModal } from '../../components/arcade/WinnerActionModal';
import { useResponsiveViewMode } from '../../hooks/useResponsiveViewMode';
import { ArcadeWinner } from '../../types/arcade';
import { formatAddisDateTime } from '../../utils/arcadeTime';

type WinnerTab = 'all' | 'pending' | 'unclaimed' | 'awarded' | 'rejected';

const PAGE_SIZE = 8;

export function ArcadeWinnersPage() {
  const { winners, competitions, players, games, reviewWinner, markWinnerPrizeAwarded } =
    useArcade();
  const [viewMode, setViewMode] = useResponsiveViewMode('arcade_winners');

  const [tab, setTab] = useState<WinnerTab>('all');
  const [page, setPage] = useState(1);
  const [activeWinner, setActiveWinner] = useState<ArcadeWinner | null>(null);
  const [awardConfirmTarget, setAwardConfirmTarget] = useState<ArcadeWinner | null>(null);

  const compMap = useMemo(() => new Map(competitions.map((c) => [c.id, c])), [competitions]);
  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const gameMap = useMemo(() => new Map(games.map((g) => [g.id, g])), [games]);

  const filtered = useMemo(() => {
    return winners.filter((w) => {
      if (tab === 'pending') return w.approvalStatus === 'Pending';
      if (tab === 'unclaimed') {
        return w.approvalStatus === 'Approved' && w.prizeStatus !== 'Awarded';
      }
      if (tab === 'awarded') return w.prizeStatus === 'Awarded';
      if (tab === 'rejected') return w.approvalStatus === 'Rejected';
      return true;
    });
  }, [winners, tab]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#202A24]">Winners &amp; Rewards</h2>
          <p className="text-xs text-[#758078] mt-0.5">
            Verify competition winners from <span className="font-mono">public.arcade_winners</span> and confirm prize fulfillment manually.
          </p>
        </div>

        <ViewModeToggle
          value={viewMode}
          onChange={setViewMode}
          className="self-start sm:self-auto"
        />
      </div>

      <ArcadeSubnav />

      <div className="p-3.5 bg-[#DCE8DF]/45 border border-[#C3D9C9] rounded-xl flex items-start gap-2.5 text-xs text-[#123C2A]">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Approving a winner sets <strong>Approval Status = Approved</strong> while keeping <strong>Prize Status = Pending</strong>. Prizes are never marked awarded automatically.
        </p>
      </div>

      <div className="bg-white border border-[#E6EAE5] rounded-xl p-2 flex items-center gap-1 overflow-x-auto">
        {(
          [
            { id: 'all', label: `All (${winners.length})` },
            {
              id: 'pending',
              label: `Pending Review (${
                winners.filter((w) => w.approvalStatus === 'Pending').length
              })`,
            },
            {
              id: 'unclaimed',
              label: `Approved / Unclaimed (${
                winners.filter(
                  (w) => w.approvalStatus === 'Approved' && w.prizeStatus !== 'Awarded'
                ).length
              })`,
            },
            {
              id: 'awarded',
              label: `Awarded History (${
                winners.filter((w) => w.prizeStatus === 'Awarded').length
              })`,
            },
            {
              id: 'rejected',
              label: `Rejected (${
                winners.filter((w) => w.approvalStatus === 'Rejected').length
              })`,
            },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setPage(1);
            }}
            className={`px-3 py-1.5 min-h-[38px] sm:min-h-[34px] text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
              tab === item.id
                ? 'bg-[#123C2A] text-white'
                : 'text-[#5C665F] hover:text-[#202A24] hover:bg-[#F7F6F0]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={winners.length === 0 ? 'No competition winners recorded yet' : 'No winners in this category'}
          description={
            winners.length === 0
              ? 'Open Live Standings on any competition to queue top finishers for winner approval and reward delivery.'
              : 'Switch tabs above to view other winner and reward records.'
          }
          action={
            winners.length === 0 ? (
              <Link
                to="/arcade/competitions"
                className="inline-flex items-center px-4 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg"
              >
                View Competitions
              </Link>
            ) : undefined
          }
        />
      ) : viewMode === 'cards' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginated.map((w) => {
              const comp = compMap.get(w.competitionId);
              const player = playerMap.get(w.playerId);
              const game = w.gameId ? gameMap.get(w.gameId) : undefined;
              return (
                <article
                  key={w.id}
                  className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-3.5 shadow-[0_1px_2px_rgba(18,60,42,0.03)]"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-[#758078] truncate">
                          {comp?.name ?? 'Competition'} · #{w.rank}
                        </p>
                        <Link
                          to={`/arcade/players/${w.playerId}`}
                          className="text-base font-semibold text-[#202A24] hover:text-[#123C2A] hover:underline block truncate mt-0.5"
                        >
                          {player?.nickname ?? 'Unknown Player'}
                        </Link>
                        <p className="text-xs text-[#5C665F] mt-0.5">
                          {game ? game.name : 'Overall Championship'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge status={w.approvalStatus} />
                        <StatusBadge status={w.prizeStatus} />
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 gap-2.5 p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg text-xs">
                      <div>
                        <dt className="text-[11px] text-[#758078]">Final Score</dt>
                        <dd className="font-mono font-semibold text-[#202A24] tabular-nums mt-0.5">
                          {w.finalScore.toLocaleString()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-[#758078]">Overall Points</dt>
                        <dd className="font-mono font-semibold text-[#123C2A] tabular-nums mt-0.5">
                          {w.overallPoints.toLocaleString()} pts
                        </dd>
                      </div>
                    </dl>

                    {w.internalNotes && (
                      <p className="text-xs text-[#5C665F] bg-[#F7F6F0]/60 p-2.5 rounded-lg border border-[#E6EAE5] break-words">
                        <strong className="text-[#202A24]">Notes:</strong> {w.internalNotes}
                      </p>
                    )}

                    <p className="text-[11px] font-mono text-[#758078]">
                      Logged {formatAddisDateTime(w.createdAt)}
                      {w.awardedAt ? ` · Awarded ${formatAddisDateTime(w.awardedAt)}` : ''}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#E6EAE5] flex flex-wrap items-center gap-2">
                    {w.approvalStatus === 'Pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => void reviewWinner(w.id, 'Approved')}
                          className="inline-flex items-center gap-1 min-h-[40px] sm:min-h-[36px] px-3 py-1.5 text-xs font-semibold text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void reviewWinner(w.id, 'Rejected')}
                          className="inline-flex items-center gap-1 min-h-[40px] sm:min-h-[36px] px-3 py-1.5 text-xs font-semibold text-[#991B1B] bg-[#FEE2E2]/60 border border-[#FECACA] rounded-lg hover:bg-[#FEE2E2]"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {w.approvalStatus === 'Approved' && w.prizeStatus !== 'Awarded' && (
                      <button
                        type="button"
                        onClick={() => setAwardConfirmTarget(w)}
                        className="inline-flex items-center gap-1 min-h-[40px] sm:min-h-[36px] px-3 py-1.5 text-xs font-semibold text-[#123C2A] bg-[#DCE8DF] border border-[#C3D9C9] rounded-lg hover:bg-[#C3D9C9]/70"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Mark Prize Awarded</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveWinner(w)}
                      className="inline-flex items-center gap-1 min-h-[40px] sm:min-h-[36px] px-3 py-1.5 text-xs font-medium text-[#202A24] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0] ml-auto"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Review &amp; Notes</span>
                    </button>
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
                  <th className="py-3 px-4">Competition</th>
                  <th className="py-3 px-4">Winner</th>
                  <th className="py-3 px-4">Winning Game</th>
                  <th className="py-3 px-4 text-right">Final Score</th>
                  <th className="py-3 px-4 text-right">Overall Points</th>
                  <th className="py-3 px-4">Approval</th>
                  <th className="py-3 px-4">Prize Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAE5] text-xs">
                {paginated.map((w) => {
                  const comp = compMap.get(w.competitionId);
                  const player = playerMap.get(w.playerId);
                  const game = w.gameId ? gameMap.get(w.gameId) : undefined;
                  return (
                    <tr key={w.id} className="hover:bg-[#F7F6F0]/60">
                      <td className="py-3.5 px-4 font-medium text-[#202A24]">
                        {comp?.name ?? 'Competition'}
                        <p className="text-[11px] font-mono text-[#758078]">Rank #{w.rank}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/arcade/players/${w.playerId}`}
                          className="font-semibold text-[#123C2A] hover:underline"
                        >
                          {player?.nickname ?? 'Unknown Player'}
                        </Link>
                        {player?.phone_e164 && (
                          <p className="text-[11px] font-mono text-[#758078]">{player.phone_e164}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#5C665F]">
                        {game ? game.name : 'Overall Champion'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#202A24]">
                        {w.finalScore.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold tabular-nums text-[#123C2A]">
                        {w.overallPoints.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={w.approvalStatus} />
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={w.prizeStatus} />
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {w.approvalStatus === 'Approved' && w.prizeStatus !== 'Awarded' && (
                            <button
                              type="button"
                              onClick={() => setAwardConfirmTarget(w)}
                              className="px-2.5 py-1.5 text-xs font-medium text-[#123C2A] bg-[#DCE8DF] rounded-lg"
                            >
                              Mark Awarded
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveWinner(w)}
                            className="px-2.5 py-1.5 text-xs font-medium text-[#202A24] bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg hover:bg-[#DCE8DF]"
                          >
                            Review
                          </button>
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
              currentPage={page}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      <WinnerActionModal
        winner={activeWinner}
        open={Boolean(activeWinner)}
        onClose={() => setActiveWinner(null)}
      />

      <ConfirmDialog
        open={Boolean(awardConfirmTarget)}
        onClose={() => setAwardConfirmTarget(null)}
        onConfirm={() => {
          if (!awardConfirmTarget) return;
          void markWinnerPrizeAwarded(awardConfirmTarget.id);
        }}
        title="Confirm Prize Awarded?"
        description="Only mark a prize as awarded after verifying reward delivery to the winning player."
        confirmLabel="Mark Prize Awarded"
        tone="primary"
      />
    </div>
  );
}
