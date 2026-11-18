import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Crown, Gamepad2, Info, Medal, Trophy } from 'lucide-react';
import { useArcade } from '../../context/ArcadeContext';
import { ArcadeSubnav } from '../../components/arcade/ArcadeSubnav';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ViewModeToggle } from '../../components/ui/ViewModeToggle';
import { useResponsiveViewMode } from '../../hooks/useResponsiveViewMode';
import {
  computeGameLeaderboard,
  computeOverallStandings,
  resolveBoundsForPeriod,
} from '../../utils/arcadeScoring';
import {
  formatAddisDateTime,
  getAddisDayBounds,
  getAddisWeekBounds,
  isTimestampInBounds,
} from '../../utils/arcadeTime';

type PeriodTab = 'today' | 'week' | 'all';
type ScopeTab = 'overall' | 'game';

export function ArcadeLeaderboardsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { games, scores, players } = useArcade();
  const [viewMode, setViewMode] = useResponsiveViewMode('arcade_leaderboards');

  const initialPeriod = (searchParams.get('period') as PeriodTab) || 'today';
  const initialScope = (searchParams.get('scope') as ScopeTab) || 'overall';
  const initialGameId = searchParams.get('gameId') || '';

  const [period, setPeriod] = useState<PeriodTab>(
    initialPeriod === 'week' || initialPeriod === 'all' ? initialPeriod : 'today'
  );
  const [scope, setScope] = useState<ScopeTab>(
    initialScope === 'game' ? 'game' : 'overall'
  );
  const [selectedGameId, setSelectedGameId] = useState<string>(initialGameId);
  const [showAuditLog, setShowAuditLog] = useState(false);

  const playableGames = useMemo(
    () => games.filter((g) => !g.isComingSoon),
    [games]
  );

  useEffect(() => {
    if (!selectedGameId && playableGames.length > 0) {
      setSelectedGameId(playableGames[0].id);
    }
  }, [playableGames, selectedGameId]);

  const updateParams = (nextPeriod: PeriodTab, nextScope: ScopeTab, nextGameId?: string) => {
    const next = new URLSearchParams();
    next.set('period', nextPeriod);
    next.set('scope', nextScope);
    if (nextScope === 'game' && nextGameId) next.set('gameId', nextGameId);
    setSearchParams(next, { replace: true });
  };

  const todayBounds = useMemo(() => getAddisDayBounds(new Date(), 0), []);
  const weekBounds = useMemo(() => getAddisWeekBounds(new Date(), 0), []);
  const activeBounds = useMemo(
    () => resolveBoundsForPeriod(period, null),
    [period]
  );

  const overallStandings = useMemo(
    () =>
      computeOverallStandings({
        games: playableGames,
        scores,
        players,
        bounds: activeBounds,
      }),
    [playableGames, scores, players, activeBounds]
  );

  const perGameChampions = useMemo(() => {
    return playableGames.map((game) => {
      const board = computeGameLeaderboard({
        game,
        scores,
        players,
        bounds: activeBounds,
      });
      return {
        game,
        leader: board[0] ?? null,
        topScoreCount: board.length,
        board,
      };
    });
  }, [playableGames, scores, players, activeBounds]);

  const selectedGame = playableGames.find((g) => g.id === selectedGameId) ?? playableGames[0];
  const selectedGameBoard = useMemo(() => {
    if (!selectedGame) return [];
    return computeGameLeaderboard({
      game: selectedGame,
      scores,
      players,
      bounds: activeBounds,
    });
  }, [selectedGame, scores, players, activeBounds]);

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const gameMap = useMemo(() => new Map(games.map((g) => [g.id, g])), [games]);

  const auditSubmissions = useMemo(() => {
    return scores
      .filter((s) => {
        if (scope === 'game' && selectedGame && s.gameId !== selectedGame.id) return false;
        if (activeBounds && !isTimestampInBounds(s.submittedAt, activeBounds)) return false;
        return true;
      })
      .slice(0, 40);
  }, [scores, scope, selectedGame, activeBounds]);

  const periodSubtitle =
    period === 'today'
      ? `Today in Addis Ababa (${todayBounds.label}, 00:00–24:00 EAT)`
      : period === 'week'
      ? `This Week in Addis Ababa (Mon–Sun: ${weekBounds.label})`
      : 'All-time verified records across all seasons';

  const boardHeading =
    scope === 'overall'
      ? period === 'today'
        ? 'A. Daily Overall Champion Standings'
        : period === 'week'
        ? 'B. Weekly Overall Champion Standings'
        : 'All-Time Overall Placement Points Standings'
      : period === 'today'
      ? 'C. Daily Champions by Game'
      : period === 'week'
      ? 'D. Weekly Champions by Game'
      : 'E. All-Time Highest Scores by Game';

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#202A24]">Arcade Leaderboards</h2>
          <p className="text-xs text-[#758078] mt-0.5">{periodSubtitle}</p>
        </div>

        <ViewModeToggle
          value={viewMode}
          onChange={setViewMode}
          className="self-start sm:self-auto"
        />
      </div>

      <ArcadeSubnav />

      {/* Filter Bar */}
      <div className="bg-white border border-[#E6EAE5] rounded-xl p-3 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Period Segmented Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg overflow-x-auto">
            {(
              [
                { id: 'today', label: 'Today (Daily)' },
                { id: 'week', label: 'This Week (Mon–Sun)' },
                { id: 'all', label: 'All Time' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setPeriod(item.id);
                  updateParams(item.id, scope, selectedGameId);
                }}
                className={`px-3 py-1.5 min-h-[38px] sm:min-h-[34px] text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  period === item.id
                    ? 'bg-white text-[#123C2A] shadow-xs font-semibold'
                    : 'text-[#5C665F] hover:text-[#202A24]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Scope Segmented Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setScope('overall');
                  updateParams(period, 'overall');
                }}
                className={`px-3 py-1.5 min-h-[38px] sm:min-h-[34px] text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  scope === 'overall'
                    ? 'bg-[#123C2A] text-white'
                    : 'text-[#5C665F] hover:text-[#202A24]'
                }`}
              >
                Overall Arcade Rankings
              </button>
              <button
                type="button"
                onClick={() => {
                  setScope('game');
                  updateParams(period, 'game', selectedGame?.id);
                }}
                className={`px-3 py-1.5 min-h-[38px] sm:min-h-[34px] text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  scope === 'game'
                    ? 'bg-[#123C2A] text-white'
                    : 'text-[#5C665F] hover:text-[#202A24]'
                }`}
              >
                Individual Games
              </button>
            </div>

            {scope === 'game' && playableGames.length > 0 && (
              <select
                value={selectedGame?.id ?? ''}
                onChange={(e) => {
                  setSelectedGameId(e.target.value);
                  updateParams(period, 'game', e.target.value);
                }}
                aria-label="Select game leaderboard"
                className="min-h-[44px] sm:min-h-[38px] px-3 py-2 text-xs bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
              >
                {playableGames.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Placement Points & Validation Rules Note */}
        <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#5C665F]">
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-[#123C2A] shrink-0 mt-0.5" />
            <span>
              <strong>Official Ranking Rules:</strong> Only <strong>Valid</strong> scores count. Overall standings sum per-game placement points (1st: 100, 2nd: 80, 3rd: 60, 4th: 40, 5th: 20) instead of raw scores. Tied scores share the same rank and placement points (e.g. 1-1-3).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowAuditLog((v) => !v)}
            className="text-xs font-medium text-[#123C2A] hover:underline whitespace-nowrap shrink-0 self-start sm:self-center"
          >
            {showAuditLog ? 'Hide score audit log' : 'Inspect raw score validation'}
          </button>
        </div>
      </div>

      {/* Per-Game Champions Strip when Individual Games is active */}
      {scope === 'game' && perGameChampions.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#202A24]">{boardHeading}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {perGameChampions.map(({ game, leader, topScoreCount }) => {
              const isSelected = selectedGame?.id === game.id;
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => {
                    setSelectedGameId(game.id);
                    updateParams(period, 'game', game.id);
                  }}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-[#DCE8DF]/45 border-[#123C2A]'
                      : 'bg-white border-[#E6EAE5] hover:border-[#123C2A]/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#123C2A] inline-flex items-center gap-1.5 truncate">
                      <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{game.name}</span>
                    </span>
                    <span className="text-[11px] font-mono text-[#758078] shrink-0">
                      {topScoreCount} ranked
                    </span>
                  </div>
                  {leader ? (
                    <div className="mt-2.5 flex items-baseline justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#202A24] truncate inline-flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 text-[#123C2A] shrink-0" />
                          <span className="truncate">{leader.playerNickname}</span>
                        </p>
                        <p className="text-[11px] text-[#758078] truncate">
                          {formatAddisDateTime(leader.submittedAt)}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold text-[#123C2A] tabular-nums shrink-0">
                        {leader.bestScore.toLocaleString()} {game.scoreUnit}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-2.5 text-xs text-[#758078]">No valid scores in this period.</p>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Leaderboard View */}
      {scope === 'overall' ? (
        overallStandings.length === 0 ? (
          <EmptyState
            title="No overall standings for this period"
            description="No valid scores were submitted during this Addis Ababa competition window."
          />
        ) : viewMode === 'cards' ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#202A24]">{boardHeading}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {overallStandings.map((entry) => (
                <article
                  key={entry.playerId}
                  className="bg-white border border-[#E6EAE5] rounded-xl p-4 space-y-3 shadow-[0_1px_2px_rgba(18,60,42,0.03)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-lg font-mono text-sm font-bold shrink-0 tabular-nums ${
                          entry.rank === 1
                            ? 'bg-[#123C2A] text-white'
                            : entry.rank <= 3
                            ? 'bg-[#DCE8DF] text-[#123C2A]'
                            : 'bg-[#F7F6F0] text-[#5C665F] border border-[#E6EAE5]'
                        }`}
                      >
                        #{entry.rank}
                      </span>
                      <div className="min-w-0">
                        <Link
                          to={`/arcade/players/${entry.playerId}`}
                          className="text-sm font-semibold text-[#202A24] hover:text-[#123C2A] hover:underline block truncate"
                        >
                          {entry.playerNickname}
                        </Link>
                        <p className="text-[11px] font-mono text-[#758078] truncate">
                          {entry.playerPhone}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono text-base font-bold text-[#123C2A] tabular-nums">
                        {entry.totalPoints} pts
                      </p>
                      {entry.isTied && (
                        <span className="text-[10px] font-semibold text-[#92400E] bg-[#FEF3C7] px-1.5 py-0.5 rounded">
                          Tied Rank
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg space-y-1 text-xs">
                    {entry.gameBreakdown.map((gb) => (
                      <div
                        key={gb.gameId}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-[#5C665F] truncate">{gb.gameName}</span>
                        <span className="font-mono text-[#202A24] tabular-nums shrink-0">
                          #{gb.rank} · {gb.bestScore.toLocaleString()} (+{gb.placementPoints} pts)
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#758078]">
                    <span>Latest: {formatAddisDateTime(entry.latestAchievedAt)}</span>
                    <StatusBadge status={entry.playerStatus} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E6EAE5] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#202A24]">{boardHeading}</h3>
              <span className="text-xs font-mono text-[#758078]">
                {overallStandings.length} ranked player{overallStandings.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E6EAE5] bg-[#F7F6F0]/70 text-[11px] font-semibold text-[#758078] uppercase tracking-wider">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4">Game Placement Breakdown</th>
                    <th className="py-3 px-4 text-right">Overall Points</th>
                    <th className="py-3 px-4">Last Achieved (Addis Ababa)</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EAE5] text-xs">
                  {overallStandings.map((entry) => (
                    <tr key={entry.playerId} className="hover:bg-[#F7F6F0]/60">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#123C2A] whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Medal className="w-3.5 h-3.5" />
                          #{entry.rank}
                          {entry.isTied && (
                            <span className="text-[10px] font-medium text-[#92400E] bg-[#FEF3C7] px-1.5 py-0.5 rounded">
                              Tied
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/arcade/players/${entry.playerId}`}
                          className="font-semibold text-[#202A24] hover:text-[#123C2A] hover:underline"
                        >
                          {entry.playerNickname}
                        </Link>
                        <p className="text-[11px] font-mono text-[#758078]">{entry.playerPhone}</p>
                      </td>
                      <td className="py-3.5 px-4 text-[#5C665F]">
                        <div className="flex flex-wrap gap-1.5">
                          {entry.gameBreakdown.map((gb) => (
                            <span
                              key={gb.gameId}
                              className="px-2 py-0.5 bg-[#F7F6F0] border border-[#E6EAE5] rounded text-[11px] font-mono"
                            >
                              {gb.gameName}: #{gb.rank} (+{gb.placementPoints})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-[#123C2A] tabular-nums">
                        {entry.totalPoints} pts
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#758078] whitespace-nowrap">
                        {formatAddisDateTime(entry.latestAchievedAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={entry.playerStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : selectedGameBoard.length === 0 ? (
        <EmptyState
          title={`No ranked scores for ${selectedGame?.name ?? 'selected game'}`}
          description="No valid score submissions match this game and timeframe."
        />
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {selectedGameBoard.map((entry) => (
            <article
              key={entry.playerId}
              className="bg-white border border-[#E6EAE5] rounded-xl p-4 space-y-3 shadow-[0_1px_2px_rgba(18,60,42,0.03)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`inline-flex items-center justify-center w-9 h-9 rounded-lg font-mono text-sm font-bold shrink-0 tabular-nums ${
                      entry.rank === 1
                        ? 'bg-[#123C2A] text-white'
                        : entry.rank <= 3
                        ? 'bg-[#DCE8DF] text-[#123C2A]'
                        : 'bg-[#F7F6F0] text-[#5C665F] border border-[#E6EAE5]'
                    }`}
                  >
                    #{entry.rank}
                  </span>
                  <div className="min-w-0">
                    <Link
                      to={`/arcade/players/${entry.playerId}`}
                      className="text-sm font-semibold text-[#202A24] hover:text-[#123C2A] hover:underline block truncate"
                    >
                      {entry.playerNickname}
                    </Link>
                    <p className="text-[11px] text-[#758078] truncate">{entry.gameName}</p>
                  </div>
                </div>
                <StatusBadge status={entry.validationStatus} />
              </div>

              <div className="flex items-baseline justify-between p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg">
                <div>
                  <p className="text-[11px] text-[#758078]">Best Valid Score</p>
                  <p className="font-mono text-lg font-bold text-[#123C2A] tabular-nums">
                    {entry.bestScore.toLocaleString()} {entry.scoreUnit}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-[#758078]">Placement</p>
                  <p className="font-mono text-xs font-semibold text-[#202A24]">
                    +{entry.placementPoints} pts{entry.isTied ? ' (Tied)' : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#758078] font-mono">
                <span>{formatAddisDateTime(entry.submittedAt)}</span>
                <span>{entry.attemptsCount} run{entry.attemptsCount === 1 ? '' : 's'}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E6EAE5] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#202A24]">
              {selectedGame?.name} — Official Rankings
            </h3>
            <span className="text-xs font-mono text-[#758078]">
              {selectedGameBoard.length} ranked player{selectedGameBoard.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E6EAE5] bg-[#F7F6F0]/70 text-[11px] font-semibold text-[#758078] uppercase tracking-wider">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Player Nickname</th>
                  <th className="py-3 px-4">Game</th>
                  <th className="py-3 px-4 text-right">Score</th>
                  <th className="py-3 px-4 text-right">Placement Pts</th>
                  <th className="py-3 px-4">Date &amp; Time (Addis Ababa)</th>
                  <th className="py-3 px-4">Validation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6EAE5] text-xs">
                {selectedGameBoard.map((entry) => (
                  <tr key={entry.playerId} className="hover:bg-[#F7F6F0]/60">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#123C2A] whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5" />
                        #{entry.rank}
                        {entry.isTied && (
                          <span className="text-[10px] font-medium text-[#92400E] bg-[#FEF3C7] px-1.5 py-0.5 rounded">
                            Tied
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#202A24]">
                      <Link
                        to={`/arcade/players/${entry.playerId}`}
                        className="hover:text-[#123C2A] hover:underline"
                      >
                        {entry.playerNickname}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-[#5C665F]">{entry.gameName}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#123C2A] tabular-nums">
                      {entry.bestScore.toLocaleString()} {entry.scoreUnit}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#202A24] tabular-nums">
                      +{entry.placementPoints}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#758078] whitespace-nowrap">
                      {formatAddisDateTime(entry.submittedAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={entry.validationStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Optional Raw Score Validation Audit Log */}
      {showAuditLog && (
        <section className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-[#E6EAE5]">
            <h3 className="text-sm font-semibold text-[#202A24]">
              Score Validation Audit Log (Latest {auditSubmissions.length})
            </h3>
            <p className="text-xs text-[#758078]">
              Shows both valid and non-valid submissions for transparency. Flagged, Pending, and Invalid scores are excluded from rankings above.
            </p>
          </div>
          {auditSubmissions.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#758078]">
              No score submissions found in this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E6EAE5] bg-[#F7F6F0]/70 text-[11px] font-semibold text-[#758078] uppercase tracking-wider">
                    <th className="py-2.5 px-4">Player</th>
                    <th className="py-2.5 px-4">Game</th>
                    <th className="py-2.5 px-4 text-right">Score</th>
                    <th className="py-2.5 px-4">Date &amp; Time</th>
                    <th className="py-2.5 px-4">Validation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EAE5] text-xs">
                  {auditSubmissions.map((s) => (
                    <tr key={s.id} className="hover:bg-[#F7F6F0]/60">
                      <td className="py-2.5 px-4 font-medium text-[#202A24]">
                        <Link
                          to={`/arcade/players/${s.playerId}`}
                          className="hover:text-[#123C2A] hover:underline"
                        >
                          {playerMap.get(s.playerId)?.nickname ?? 'Player'}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 text-[#5C665F]">
                        {gameMap.get(s.gameId)?.name ?? 'Arcade Game'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-[#202A24]">
                        {s.score.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[#758078] whitespace-nowrap">
                        {formatAddisDateTime(s.submittedAt)}
                      </td>
                      <td className="py-2.5 px-4">
                        <StatusBadge status={s.validationStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
