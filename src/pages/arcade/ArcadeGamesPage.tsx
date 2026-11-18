import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Edit3, Gamepad2, ShieldCheck } from 'lucide-react';
import { useArcade } from '../../context/ArcadeContext';
import { ArcadeSubnav } from '../../components/arcade/ArcadeSubnav';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ViewModeToggle } from '../../components/ui/ViewModeToggle';
import { EditGameModal } from '../../components/arcade/EditGameModal';
import { useResponsiveViewMode } from '../../hooks/useResponsiveViewMode';
import { ArcadeGame } from '../../types/arcade';

export function ArcadeGamesPage() {
  const { games, sessions, scores, updateGame } = useArcade();
  const [viewMode, setViewMode] = useResponsiveViewMode('arcade_games');
  const [editingGame, setEditingGame] = useState<ArcadeGame | null>(null);

  const enrichedGames = useMemo(() => {
    return games.map((game) => {
      const gameSessions = sessions.filter((s) => s.gameId === game.id);
      const validScores = scores.filter((sc) => sc.gameId === game.id && sc.isValid);
      const bestScore =
        validScores.length > 0 ? Math.max(...validScores.map((s) => s.score)) : 0;
      return {
        game,
        sessionsCount: gameSessions.length,
        validScoresCount: validScores.length,
        bestScore,
      };
    });
  }, [games, sessions, scores]);

  const getGameBadge = (game: ArcadeGame) => {
    if (game.isComingSoon) return 'Coming Soon';
    return game.isActive ? 'Active' : 'Disabled';
  };

  const handleQuickOrderDelta = async (game: ArcadeGame, delta: number) => {
    const nextOrder = Math.max(1, game.displayOrder + delta);
    await updateGame({
      id: game.id,
      description: game.description,
      isActive: game.isActive,
      isComingSoon: game.isComingSoon,
      displayOrder: nextOrder,
    });
  };

  const handleToggleActive = async (game: ArcadeGame) => {
    await updateGame({
      id: game.id,
      description: game.description,
      isActive: !game.isActive,
      isComingSoon: false,
      displayOrder: game.displayOrder,
    });
  };

  const handleToggleComingSoon = async (game: ArcadeGame) => {
    const nextComingSoon = !game.isComingSoon;
    await updateGame({
      id: game.id,
      description: game.description,
      isActive: nextComingSoon ? false : true,
      isComingSoon: nextComingSoon,
      displayOrder: game.displayOrder,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#202A24]">Arcade Games Management</h2>
          <p className="text-xs text-[#758078] mt-0.5">
            Manage <span className="font-mono">public.arcade_games</span> availability, coming soon state, display order, and descriptions. Game records cannot be deleted so historical scores remain intact.
          </p>
        </div>

        <ViewModeToggle
          value={viewMode}
          onChange={setViewMode}
          className="self-start sm:self-auto"
        />
      </div>

      <ArcadeSubnav />

      <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-xl flex items-center gap-2 text-xs text-[#5C665F]">
        <ShieldCheck className="w-4 h-4 text-[#123C2A] shrink-0" />
        <span>
          Historical score integrity is enforced: games can be disabled or marked Coming Soon, never deleted.
        </span>
      </div>

      {enrichedGames.length === 0 ? (
        <EmptyState
          title="No games registered in public.arcade_games"
          description="Games registered in the Supabase arcade_games table will appear here for display order, description, and status management."
        />
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {enrichedGames.map(({ game, sessionsCount, validScoresCount, bestScore }) => (
            <article
              key={game.id}
              className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-[0_1px_2px_rgba(18,60,42,0.03)]"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-[#758078]">
                      <span className="px-2 py-0.5 bg-[#F7F6F0] border border-[#E6EAE5] rounded font-semibold text-[#202A24]">
                        #{game.displayOrder}
                      </span>
                      <span>{game.slug}</span>
                    </div>
                    <h3 className="text-base font-semibold text-[#202A24] mt-1.5 flex items-center gap-1.5">
                      <Gamepad2 className="w-4 h-4 text-[#123C2A] shrink-0" />
                      <span className="truncate">{game.name}</span>
                    </h3>
                  </div>
                  <StatusBadge status={getGameBadge(game)} />
                </div>

                <p className="text-xs text-[#5C665F] leading-relaxed min-h-[2.5rem]">
                  {game.description || 'No description added yet.'}
                </p>

                <dl className="grid grid-cols-3 gap-2 p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg text-xs">
                  <div>
                    <dt className="text-[11px] text-[#758078]">Sessions</dt>
                    <dd className="font-mono font-semibold text-[#202A24] tabular-nums mt-0.5">
                      {sessionsCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-[#758078]">Valid Scores</dt>
                    <dd className="font-mono font-semibold text-[#202A24] tabular-nums mt-0.5">
                      {validScoresCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-[#758078]">Top Score</dt>
                    <dd className="font-mono font-semibold text-[#123C2A] tabular-nums mt-0.5">
                      {bestScore.toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="pt-3 border-t border-[#E6EAE5] space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(game)}
                    className={`flex-1 min-h-[40px] sm:min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      game.isActive
                        ? 'text-[#92400E] bg-[#FEF3C7]/60 border-[#FDE68A] hover:bg-[#FEF3C7]'
                        : 'text-[#123C2A] bg-[#DCE8DF]/70 border-[#C3D9C9] hover:bg-[#DCE8DF]'
                    }`}
                  >
                    {game.isActive ? 'Disable' : 'Activate'}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleToggleComingSoon(game)}
                    className={`flex-1 min-h-[40px] sm:min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      game.isComingSoon
                        ? 'text-[#075985] bg-[#E0F2FE] border-[#BAE6FD]'
                        : 'text-[#5C665F] bg-[#F7F6F0] border-[#E6EAE5] hover:text-[#202A24]'
                    }`}
                  >
                    {game.isComingSoon ? 'Remove Coming Soon' : 'Coming Soon'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleQuickOrderDelta(game, -1)}
                    disabled={game.displayOrder <= 1}
                    aria-label={`Move ${game.name} up`}
                    className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] sm:min-h-[36px] px-2.5 text-xs text-[#202A24] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0] disabled:opacity-40"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleQuickOrderDelta(game, 1)}
                    aria-label={`Move ${game.name} down`}
                    className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] sm:min-h-[36px] px-2.5 text-xs text-[#202A24] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0]"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingGame(game)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[36px] px-3 py-1.5 text-xs font-semibold text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21]"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Details</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E6EAE5] bg-[#F7F6F0]/70 text-[11px] font-semibold text-[#758078] uppercase tracking-wider">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Game</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Sessions</th>
                  <th className="py-3 px-4 text-right">Valid Scores</th>
                  <th className="py-3 px-4 text-right">Top Score</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAE5] text-xs">
                {enrichedGames.map(({ game, sessionsCount, validScoresCount, bestScore }) => (
                  <tr key={game.id} className="hover:bg-[#F7F6F0]/60">
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#202A24]">
                      #{game.displayOrder}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#202A24]">{game.name}</p>
                      <p className="text-[11px] font-mono text-[#758078]">{game.slug}</p>
                    </td>
                    <td className="py-3.5 px-4 text-[#5C665F] max-w-xs truncate">
                      {game.description || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={getGameBadge(game)} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#202A24]">
                      {sessionsCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#202A24]">
                      {validScoresCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#123C2A]">
                      {bestScore.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleToggleActive(game)}
                          className="px-2.5 py-1.5 text-xs font-medium text-[#123C2A] bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg hover:bg-[#DCE8DF]"
                        >
                          {game.isActive ? 'Disable' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingGame(game)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21]"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EditGameModal
        game={editingGame}
        open={Boolean(editingGame)}
        onClose={() => setEditingGame(null)}
      />
    </div>
  );
}
