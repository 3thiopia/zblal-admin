import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Gamepad2,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import { useArcade } from '../../context/ArcadeContext';
import { ArcadeSubnav } from '../../components/arcade/ArcadeSubnav';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  computeGameLeaderboard,
  computeOverallStandings,
  computePlayerSummaries,
} from '../../utils/arcadeScoring';
import {
  formatAddisDate,
  formatAddisDateTime,
  getAddisDayBounds,
  getAddisWeekBounds,
  isTimestampInBounds,
} from '../../utils/arcadeTime';
import { isCallablePhone, toTelHref } from '../../utils/formatters';

export function ArcadePlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { players, games, sessions, scores, togglePlayerStatus } = useArcade();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const player = players.find((p) => p.id === id);
  const gameMap = useMemo(() => new Map(games.map((g) => [g.id, g])), [games]);
  const activeGames = useMemo(() => games.filter((g) => !g.isComingSoon), [games]);

  const summary = useMemo(() => {
    if (!player) return null;
    return computePlayerSummaries({ players: [player], games, sessions, scores }).get(player.id);
  }, [player, games, sessions, scores]);

  const playerScores = useMemo(
    () =>
      scores
        .filter((s) => s.playerId === id)
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()),
    [scores, id]
  );

  const playerSessions = useMemo(
    () => sessions.filter((s) => s.playerId === id),
    [sessions, id]
  );

  const todayBounds = useMemo(() => getAddisDayBounds(new Date(), 0), []);
  const weekBounds = useMemo(() => getAddisWeekBounds(new Date(), 0), []);

  const todayStanding = useMemo(() => {
    if (!player) return null;
    return computeOverallStandings({
      games: activeGames,
      scores,
      players,
      bounds: todayBounds,
    }).find((e) => e.playerId === player.id);
  }, [player, activeGames, scores, players, todayBounds]);

  const weekStanding = useMemo(() => {
    if (!player) return null;
    return computeOverallStandings({
      games: activeGames,
      scores,
      players,
      bounds: weekBounds,
    }).find((e) => e.playerId === player.id);
  }, [player, activeGames, scores, players, weekBounds]);

  const todayStats = useMemo(() => {
    const dayScores = playerScores.filter((s) => isTimestampInBounds(s.submittedAt, todayBounds));
    const valid = dayScores.filter((s) => s.isValid);
    const daySessions = playerSessions.filter((s) => isTimestampInBounds(s.startedAt, todayBounds));
    return {
      plays: daySessions.length > 0 ? daySessions.length : dayScores.length,
      bestScore: valid.length > 0 ? Math.max(...valid.map((s) => s.score)) : 0,
      validCount: valid.length,
    };
  }, [playerScores, playerSessions, todayBounds]);

  const weekStats = useMemo(() => {
    const wkScores = playerScores.filter((s) => isTimestampInBounds(s.submittedAt, weekBounds));
    const valid = wkScores.filter((s) => s.isValid);
    const wkSessions = playerSessions.filter((s) => isTimestampInBounds(s.startedAt, weekBounds));
    return {
      plays: wkSessions.length > 0 ? wkSessions.length : wkScores.length,
      bestScore: valid.length > 0 ? Math.max(...valid.map((s) => s.score)) : 0,
      validCount: valid.length,
    };
  }, [playerScores, playerSessions, weekBounds]);

  const perGamePerformance = useMemo(() => {
    if (!player) return [];
    return games
      .map((game) => {
        const gScores = playerScores.filter((s) => s.gameId === game.id);
        const valid = gScores.filter((s) => s.isValid);
        const gSessions = playerSessions.filter((s) => s.gameId === game.id);
        const plays = gSessions.length > 0 ? gSessions.length : gScores.length;
        const bestScore = valid.length > 0 ? Math.max(...valid.map((s) => s.score)) : 0;
        const avgScore =
          valid.length > 0
            ? Math.round(valid.reduce((sum, s) => sum + s.score, 0) / valid.length)
            : 0;
        const lastPlayed =
          gScores[0]?.submittedAt || gSessions[0]?.startedAt || undefined;

        const dailyEntry = computeGameLeaderboard({
          game,
          scores,
          players,
          bounds: todayBounds,
        }).find((e) => e.playerId === player.id);

        const weeklyEntry = computeGameLeaderboard({
          game,
          scores,
          players,
          bounds: weekBounds,
        }).find((e) => e.playerId === player.id);

        return {
          game,
          plays,
          validCount: valid.length,
          bestScore,
          avgScore,
          lastPlayed,
          dailyRank: dailyEntry?.rank,
          weeklyRank: weeklyEntry?.rank,
        };
      })
      .filter((row) => row.plays > 0 || row.validCount > 0);
  }, [player, games, playerScores, playerSessions, scores, players, todayBounds, weekBounds]);

  if (!player) {
    return (
      <div className="space-y-4">
        <ArcadeSubnav />
        <EmptyState
          title="Arcade player not found"
          description="This player record could not be found in public.arcade_players."
          action={
            <Link
              to="/arcade/players"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Players
            </Link>
          }
        />
      </div>
    );
  }

  const callable = isCallablePhone(player.phone_e164);

  return (
    <div className="space-y-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/arcade/players"
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 text-xs font-medium text-[#123C2A] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Arcade Players
        </Link>

        <Link
          to="/arcade/leaderboards"
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 text-xs font-medium text-[#202A24] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0]"
        >
          <Trophy className="w-3.5 h-3.5 text-[#123C2A]" />
          Open Leaderboards
        </Link>
      </div>

      <ArcadeSubnav />

      {/* Player Header */}
      <section className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-semibold text-[#202A24] break-words">
                {player.nickname}
              </h2>
              <StatusBadge status={player.status} />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#758078]">
              <span className="inline-flex items-center gap-1 font-mono text-[#123C2A] font-medium">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>{callable ? player.phone_e164 : 'No phone on file'}</span>
              </span>
              <span className="inline-flex items-center gap-1 font-mono">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Registered {formatAddisDate(player.registeredAt)}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {callable && (
              <a
                href={toTelHref(player.phone_e164)}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs font-semibold text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21]"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Player</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                player.status === 'Active'
                  ? 'text-[#991B1B] bg-[#FEE2E2]/60 border-[#FECACA] hover:bg-[#FEE2E2]'
                  : 'text-[#123C2A] bg-[#DCE8DF] border-[#C3D9C9] hover:bg-[#C3D9C9]/70'
              }`}
            >
              {player.status === 'Active' ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Suspend Player</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Reactivate Player</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Top Personal Stats */}
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#E6EAE5] text-xs">
          <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg">
            <dt className="text-[#758078]">Total Games Played</dt>
            <dd className="text-lg font-mono font-bold text-[#202A24] tabular-nums mt-0.5">
              {summary?.totalGamesPlayed ?? 0}
            </dd>
          </div>
          <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg">
            <dt className="text-[#758078]">All-Time Personal Best</dt>
            <dd className="text-lg font-mono font-bold text-[#123C2A] tabular-nums mt-0.5">
              {(summary?.highestScore ?? 0).toLocaleString()}
            </dd>
          </div>
          <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg">
            <dt className="text-[#758078]">Most Played Game</dt>
            <dd className="text-sm font-semibold text-[#202A24] truncate mt-1">
              {summary?.mostPlayedGameName ?? '—'}
            </dd>
          </div>
          <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg">
            <dt className="text-[#758078]">Last Activity</dt>
            <dd className="text-xs font-mono text-[#202A24] mt-1">
              {summary?.lastActivityAt ? formatAddisDateTime(summary.lastActivityAt) : '—'}
            </dd>
          </div>
        </dl>
      </section>

      {/* Daily & Weekly Performance */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#202A24]">Daily Performance (Today)</h3>
              <p className="text-[11px] text-[#758078]">{todayBounds.label} · Africa/Addis_Ababa</p>
            </div>
            {todayStanding && (
              <span className="px-2.5 py-1 rounded-md bg-[#DCE8DF] text-[#123C2A] font-mono text-xs font-bold">
                Overall #{todayStanding.rank}
              </span>
            )}
          </div>
          <dl className="grid grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 bg-[#F7F6F0] rounded-lg border border-[#E6EAE5]">
              <dt className="text-[11px] text-[#758078]">Plays</dt>
              <dd className="font-mono font-semibold text-[#202A24] mt-0.5 tabular-nums">
                {todayStats.plays}
              </dd>
            </div>
            <div className="p-2.5 bg-[#F7F6F0] rounded-lg border border-[#E6EAE5]">
              <dt className="text-[11px] text-[#758078]">Best Score</dt>
              <dd className="font-mono font-semibold text-[#202A24] mt-0.5 tabular-nums">
                {todayStats.bestScore.toLocaleString()}
              </dd>
            </div>
            <div className="p-2.5 bg-[#F7F6F0] rounded-lg border border-[#E6EAE5]">
              <dt className="text-[11px] text-[#758078]">Placement Pts</dt>
              <dd className="font-mono font-semibold text-[#123C2A] mt-0.5 tabular-nums">
                {todayStanding?.totalPoints ?? 0}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#202A24]">Weekly Performance (Mon–Sun)</h3>
              <p className="text-[11px] text-[#758078]">{weekBounds.label} · Africa/Addis_Ababa</p>
            </div>
            {weekStanding && (
              <span className="px-2.5 py-1 rounded-md bg-[#DCE8DF] text-[#123C2A] font-mono text-xs font-bold">
                Overall #{weekStanding.rank}
              </span>
            )}
          </div>
          <dl className="grid grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 bg-[#F7F6F0] rounded-lg border border-[#E6EAE5]">
              <dt className="text-[11px] text-[#758078]">Plays</dt>
              <dd className="font-mono font-semibold text-[#202A24] mt-0.5 tabular-nums">
                {weekStats.plays}
              </dd>
            </div>
            <div className="p-2.5 bg-[#F7F6F0] rounded-lg border border-[#E6EAE5]">
              <dt className="text-[11px] text-[#758078]">Best Score</dt>
              <dd className="font-mono font-semibold text-[#202A24] mt-0.5 tabular-nums">
                {weekStats.bestScore.toLocaleString()}
              </dd>
            </div>
            <div className="p-2.5 bg-[#F7F6F0] rounded-lg border border-[#E6EAE5]">
              <dt className="text-[11px] text-[#758078]">Placement Pts</dt>
              <dd className="font-mono font-semibold text-[#123C2A] mt-0.5 tabular-nums">
                {weekStanding?.totalPoints ?? 0}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Individual Game Performance & All-Time Personal Bests */}
      <section className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-[#E6EAE5]">
          <h3 className="text-sm font-semibold text-[#202A24]">
            Individual Game Performance &amp; All-Time Personal Bests
          </h3>
          <p className="text-xs text-[#758078] mt-0.5">
            Personal bests, average scores, and current daily/weekly rank per game
          </p>
        </div>

        {perGamePerformance.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#758078]">
            This player has not recorded any game sessions or scores yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4 sm:p-5">
            {perGamePerformance.map((item) => (
              <div
                key={item.game.id}
                className="p-4 bg-[#F7F6F0]/60 border border-[#E6EAE5] rounded-xl space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-[#202A24] truncate flex items-center gap-1.5">
                      <Gamepad2 className="w-4 h-4 text-[#123C2A] shrink-0" />
                      <span className="truncate">{item.game.name}</span>
                    </h4>
                    <p className="text-[11px] text-[#758078] mt-0.5">
                      {item.plays} play{item.plays === 1 ? '' : 's'} · {item.validCount} valid score
                      {item.validCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-bold text-[#123C2A] tabular-nums shrink-0">
                    {item.bestScore.toLocaleString()} {item.game.scoreUnit}
                  </span>
                </div>

                <dl className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E6EAE5] text-[11px]">
                  <div>
                    <dt className="text-[#758078]">Avg Score</dt>
                    <dd className="font-mono font-medium text-[#202A24] mt-0.5 tabular-nums">
                      {item.avgScore.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#758078]">Today Rank</dt>
                    <dd className="font-mono font-semibold text-[#123C2A] mt-0.5">
                      {item.dailyRank ? `#${item.dailyRank}` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#758078]">Week Rank</dt>
                    <dd className="font-mono font-semibold text-[#123C2A] mt-0.5">
                      {item.weeklyRank ? `#${item.weeklyRank}` : '—'}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Score History */}
      <section className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-[#E6EAE5] flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-[#202A24]">Score History</h3>
            <p className="text-xs text-[#758078]">
              Complete chronological score ledger ({playerScores.length} record
              {playerScores.length === 1 ? '' : 's'})
            </p>
          </div>
        </div>

        {playerScores.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#758078]">
            No scores submitted by {player.nickname} yet.
          </div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-[#E6EAE5]">
              {playerScores.map((s) => {
                const g = gameMap.get(s.gameId);
                return (
                  <div key={s.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#202A24] truncate">
                        {g?.name ?? 'Arcade Game'}
                      </p>
                      <p className="text-[11px] font-mono text-[#758078] mt-0.5">
                        {formatAddisDateTime(s.submittedAt)}
                      </p>
                    </div>
                    <div className="text-right space-y-1 shrink-0">
                      <p className="font-mono text-sm font-bold text-[#123C2A] tabular-nums">
                        {s.score.toLocaleString()} {g?.scoreUnit ?? 'pts'}
                      </p>
                      <StatusBadge status={s.validationStatus} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E6EAE5] bg-[#F7F6F0]/70 text-[11px] font-semibold text-[#758078] uppercase tracking-wider">
                    <th className="py-3 px-4">Game</th>
                    <th className="py-3 px-4 text-right">Score</th>
                    <th className="py-3 px-4">Validation</th>
                    <th className="py-3 px-4">Date &amp; Time (Addis Ababa)</th>
                    <th className="py-3 px-4">Session</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EAE5] text-xs">
                  {playerScores.map((s) => {
                    const g = gameMap.get(s.gameId);
                    return (
                      <tr key={s.id} className="hover:bg-[#F7F6F0]/60">
                        <td className="py-3 px-4 font-medium text-[#202A24]">
                          {g?.name ?? 'Arcade Game'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-[#123C2A] tabular-nums">
                          {s.score.toLocaleString()} {g?.scoreUnit ?? 'pts'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={s.validationStatus} />
                        </td>
                        <td className="py-3 px-4 font-mono text-[#758078] whitespace-nowrap">
                          {formatAddisDateTime(s.submittedAt)}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#758078] whitespace-nowrap">
                          {s.sessionId ? s.sessionId.slice(0, 8) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          const next = player.status === 'Active' ? 'Suspended' : 'Active';
          void togglePlayerStatus(player.id, next);
        }}
        title={
          player.status === 'Active'
            ? `Suspend ${player.nickname}?`
            : `Reactivate ${player.nickname}?`
        }
        description={
          player.status === 'Active'
            ? 'The player will be marked Suspended in public.arcade_players. Historical scores and sessions will NOT be deleted.'
            : 'The player will be restored to Active status in public.arcade_players.'
        }
        confirmLabel={player.status === 'Active' ? 'Suspend Player' : 'Reactivate Player'}
        tone={player.status === 'Active' ? 'danger' : 'primary'}
      />
    </div>
  );
}
