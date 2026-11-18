import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Gamepad2,
  Plus,
  Trophy,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts';
import { useArcade } from '../../context/ArcadeContext';
import { ArcadeSubnav } from '../../components/arcade/ArcadeSubnav';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  buildLast7DaysArcadeTrend,
  computeOverallStandings,
} from '../../utils/arcadeScoring';
import {
  formatAddisDateTime,
  getAddisDayBounds,
  getAddisWeekBounds,
  isTimestampInBounds,
} from '../../utils/arcadeTime';
import { formatTimeAgo } from '../../utils/formatters';

export function ArcadeDashboardPage() {
  const {
    players,
    games,
    sessions,
    scores,
    competitions,
    winners,
    loadingArcade,
  } = useArcade();

  const activeGames = useMemo(
    () => games.filter((g) => !g.isComingSoon),
    [games]
  );

  const todayBounds = useMemo(() => getAddisDayBounds(new Date(), 0), []);
  const weekBounds = useMemo(() => getAddisWeekBounds(new Date(), 0), []);

  const todayStandings = useMemo(
    () =>
      computeOverallStandings({
        games: activeGames,
        scores,
        players,
        bounds: todayBounds,
      }),
    [activeGames, scores, players, todayBounds]
  );

  const weekStandings = useMemo(
    () =>
      computeOverallStandings({
        games: activeGames,
        scores,
        players,
        bounds: weekBounds,
      }),
    [activeGames, scores, players, weekBounds]
  );

  const todayLeader = todayStandings[0] ?? null;
  const weekLeader = weekStandings[0] ?? null;

  const totalGamesPlayed = sessions.length > 0 ? sessions.length : scores.length;
  const validScoresCount = scores.filter((s) => s.isValid).length;
  const currentDailyComps = competitions.filter(
    (c) => c.competitionType === 'daily' && c.status === 'Active'
  ).length;
  const currentWeeklyComps = competitions.filter(
    (c) => c.competitionType === 'weekly' && c.status === 'Active'
  ).length;
  const pendingWinnersCount = winners.filter(
    (w) => w.approvalStatus === 'Pending' || (w.approvalStatus === 'Approved' && w.prizeStatus === 'Pending')
  ).length;

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const gameMap = useMemo(() => new Map(games.map((g) => [g.id, g])), [games]);

  const todayHighScore = useMemo(() => {
    let best: (typeof scores)[number] | null = null;
    for (const s of scores) {
      if (!s.isValid) continue;
      if (!isTimestampInBounds(s.submittedAt, todayBounds)) continue;
      if (
        !best ||
        s.score > best.score ||
        (s.score === best.score &&
          new Date(s.submittedAt).getTime() < new Date(best.submittedAt).getTime())
      ) {
        best = s;
      }
    }
    return best;
  }, [scores, todayBounds]);

  const mostPopularGame = useMemo(() => {
    if (games.length === 0) return null;
    const useSessions = sessions.length > 0;
    let topGame: (typeof games)[number] | null = null;
    let topCount = 0;
    let topScoresCount = 0;

    for (const g of games) {
      const sessCount = sessions.filter((s) => s.gameId === g.id).length;
      const scCount = scores.filter((sc) => sc.gameId === g.id).length;
      const primaryCount = useSessions ? sessCount : scCount;
      if (primaryCount > topCount || (primaryCount === topCount && primaryCount > 0 && scCount > topScoresCount)) {
        topGame = g;
        topCount = primaryCount;
        topScoresCount = scCount;
      }
    }
    if (!topGame || topCount === 0) return null;
    return {
      game: topGame,
      sessionsCount: sessions.filter((s) => s.gameId === topGame!.id).length,
      scoresCount: topScoresCount,
    };
  }, [games, sessions, scores]);

  const todayHighScorePlayer = todayHighScore ? playerMap.get(todayHighScore.playerId) : undefined;
  const todayHighScoreGame = todayHighScore ? gameMap.get(todayHighScore.gameId) : undefined;

  const statCards = [
    {
      label: 'Registered Players',
      value: players.length.toLocaleString(),
      sub: `${players.filter((p) => p.isActive).length} active accounts`,
      to: '/arcade/players',
    },
    {
      label: 'Total Game Sessions',
      value: totalGamesPlayed.toLocaleString(),
      sub: `${sessions.length.toLocaleString()} sessions logged`,
      to: '/arcade/leaderboards',
    },
    {
      label: 'Submitted Scores',
      value: scores.length.toLocaleString(),
      sub: `${validScoresCount.toLocaleString()} verified valid`,
      to: '/arcade/leaderboards?period=all',
    },
    {
      label: "Today's High Score",
      value: todayHighScore
        ? `${todayHighScore.score.toLocaleString()} ${todayHighScoreGame?.scoreUnit ?? 'pts'}`
        : 'No valid score',
      sub: todayHighScore
        ? `${todayHighScorePlayer?.nickname ?? 'Player'} · ${todayHighScoreGame?.name ?? 'Game'}`
        : 'Today (Addis Ababa)',
      to: todayHighScore
        ? `/arcade/leaderboards?period=today&scope=game&gameId=${todayHighScore.gameId}`
        : '/arcade/leaderboards?period=today&scope=game',
    },
    {
      label: "Today's Leader",
      value: todayLeader ? todayLeader.playerNickname : 'No leader yet',
      sub: todayLeader
        ? `${todayLeader.totalPoints} placement pts today`
        : 'Addis Ababa daily cycle',
      to: todayLeader ? `/arcade/players/${todayLeader.playerId}` : '/arcade/leaderboards?period=today',
    },
    {
      label: "This Week's Leader",
      value: weekLeader ? weekLeader.playerNickname : 'No leader yet',
      sub: weekLeader
        ? `${weekLeader.totalPoints} placement pts this week`
        : 'Mon–Sun Addis Ababa',
      to: weekLeader ? `/arcade/players/${weekLeader.playerId}` : '/arcade/leaderboards?period=week',
    },
    {
      label: 'Most Popular Game',
      value: mostPopularGame ? mostPopularGame.game.name : 'No plays yet',
      sub: mostPopularGame
        ? `${mostPopularGame.sessionsCount.toLocaleString()} sessions · ${mostPopularGame.scoresCount.toLocaleString()} scores`
        : `${games.length} registered games`,
      to: '/arcade/games',
    },
    {
      label: 'Active Competitions',
      value: String(currentDailyComps + currentWeeklyComps),
      sub: `${currentDailyComps} daily · ${currentWeeklyComps} weekly · ${pendingWinnersCount} pending`,
      to: '/arcade/competitions',
    },
  ];

  const trendSeries = useMemo(
    () => buildLast7DaysArcadeTrend({ sessions, scores }),
    [sessions, scores]
  );

  const gameParticipationSeries = useMemo(() => {
    return games.map((g) => ({
      name: g.name.length > 14 ? `${g.name.slice(0, 14)}…` : g.name,
      sessions: sessions.filter((s) => s.gameId === g.id).length,
      validScores: scores.filter((sc) => sc.gameId === g.id && sc.isValid).length,
    }));
  }, [games, sessions, scores]);

  const recentActivity = useMemo(() => {
    type ActivityRow = {
      id: string;
      playerId: string;
      playerName: string;
      description: string;
      timestamp: string;
      badge?: string;
    };
    const items: ActivityRow[] = [];

    for (const s of scores.slice(0, 10)) {
      const p = playerMap.get(s.playerId);
      const g = gameMap.get(s.gameId);
      items.push({
        id: `score-${s.id}`,
        playerId: s.playerId,
        playerName: p?.nickname ?? 'Player',
        description: `submitted ${s.score.toLocaleString()} ${g?.scoreUnit ?? 'pts'} in ${
          g?.name ?? 'Arcade Game'
        }`,
        timestamp: s.submittedAt,
        badge: s.validationStatus,
      });
    }

    for (const sess of sessions.slice(0, 8)) {
      const p = playerMap.get(sess.playerId);
      const g = gameMap.get(sess.gameId);
      items.push({
        id: `sess-${sess.id}`,
        playerId: sess.playerId,
        playerName: p?.nickname ?? 'Player',
        description: `played session in ${g?.name ?? 'Arcade Game'} (${sess.status})`,
        timestamp: sess.endedAt || sess.startedAt,
      });
    }

    return items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 7);
  }, [scores, sessions, playerMap, gameMap]);

  const recentHighScores = useMemo(() => {
    return scores
      .filter((s) => s.isValid)
      .slice()
      .sort((a, b) => {
        const dayDiff = new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        // Show top scores among recent submissions
        if (Math.abs(dayDiff) > 1000 * 60 * 60 * 24 * 7) return dayDiff;
        return b.score - a.score;
      })
      .slice(0, 6);
  }, [scores]);

  return (
    <div className="space-y-5 sm:space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-[#202A24] tracking-tight">
            Arcade Management Overview
          </h2>
          <p className="text-xs text-[#758078] mt-0.5">
            Live player activity, placement-points championships, and game telemetry (Africa/Addis_Ababa).
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
          <Link
            to="/arcade/leaderboards"
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-3.5 py-2 text-xs font-medium text-[#202A24] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0] whitespace-nowrap"
          >
            <Trophy className="w-3.5 h-3.5 text-[#123C2A] shrink-0" />
            <span>Leaderboards</span>
          </Link>
          <Link
            to="/arcade/competitions?new=1"
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-3.5 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>New Competition</span>
          </Link>
        </div>
      </div>

      <ArcadeSubnav />

      {/* Clickable Statistic Cards */}
      <section
        aria-label="Arcade Key Metrics"
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
      >
        {statCards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="block bg-white border border-[#E6EAE5] rounded-xl p-3.5 sm:p-4 shadow-[0_1px_2px_rgba(18,60,42,0.03)] transition-all duration-150 hover:border-[#123C2A]/45 hover:bg-[#F7F6F0]/45 hover:shadow-[0_3px_10px_rgba(18,60,42,0.08)] active:scale-[0.98] min-w-0"
          >
            <p className="text-[11px] font-medium text-[#758078] truncate">{card.label}</p>
            <p className="text-lg sm:text-xl font-semibold text-[#202A24] font-mono tabular-nums mt-1.5 truncate">
              {loadingArcade && players.length === 0 ? '—' : card.value}
            </p>
            <p className="text-[11px] text-[#758078] mt-1 truncate">{card.sub}</p>
          </Link>
        ))}
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#202A24]">
                7-Day Arcade Activity (Addis Ababa)
              </h3>
              <p className="text-xs text-[#758078] mt-0.5">
                Daily game sessions vs verified valid scores
              </p>
            </div>
            <Link
              to="/arcade/leaderboards?period=today"
              className="text-xs font-medium text-[#123C2A] hover:underline whitespace-nowrap shrink-0"
            >
              Today&apos;s ranks
            </Link>
          </div>
          {sessions.length === 0 && scores.length === 0 ? (
            <div className="h-56 sm:h-64 flex items-center justify-center text-xs text-[#758078] bg-[#F7F6F0]/60 rounded-lg border border-dashed border-[#E6EAE5]">
              No arcade sessions or scores submitted in the last 7 days.
            </div>
          ) : (
            <div className="h-56 sm:h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendSeries} margin={{ top: 8, right: 6, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6EAE5" vertical={false} />
                  <XAxis
                    dataKey="dayLabel"
                    tick={{ fontSize: 11, fill: '#758078' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    width={36}
                    tick={{ fontSize: 11, fill: '#758078' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E6EAE5',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    name="Game Sessions"
                    stroke="#758078"
                    strokeWidth={1.5}
                    fill="#F7F6F0"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="validScores"
                    name="Valid Scores"
                    stroke="#123C2A"
                    strokeWidth={2}
                    fill="#DCE8DF"
                    fillOpacity={0.8}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#202A24]">
                Participation by Registered Game
              </h3>
              <p className="text-xs text-[#758078] mt-0.5">
                Sessions and valid score submissions across arcade_games
              </p>
            </div>
            <Link
              to="/arcade/games"
              className="text-xs font-medium text-[#123C2A] hover:underline whitespace-nowrap shrink-0"
            >
              Manage games
            </Link>
          </div>
          {gameParticipationSeries.length === 0 ? (
            <div className="h-56 sm:h-64 flex items-center justify-center text-xs text-[#758078] bg-[#F7F6F0]/60 rounded-lg border border-dashed border-[#E6EAE5]">
              No games registered in public.arcade_games yet.
            </div>
          ) : (
            <div className="h-56 sm:h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={gameParticipationSeries}
                  margin={{ top: 8, right: 6, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6EAE5" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#758078' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    width={36}
                    tick={{ fontSize: 11, fill: '#758078' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E6EAE5',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="sessions" name="Sessions" fill="#DCE8DF" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="validScores"
                    name="Valid Scores"
                    fill="#123C2A"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* Leaderboard Previews: Today & This Week */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden min-w-0">
          <div className="px-4 sm:px-5 py-3.5 border-b border-[#E6EAE5] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#202A24]">
                Daily Overall Championship Preview
              </h3>
              <p className="text-xs text-[#758078] truncate">
                Today ({todayBounds.label}, Addis Ababa) · Placement points
              </p>
            </div>
            <Link
              to="/arcade/leaderboards?period=today&scope=overall"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#123C2A] hover:underline whitespace-nowrap shrink-0"
            >
              Full board
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {todayStandings.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#758078]">
              No valid scores submitted today in Addis Ababa time yet.
            </div>
          ) : (
            <ul className="divide-y divide-[#E6EAE5]">
              {todayStandings.slice(0, 5).map((entry) => (
                <li
                  key={entry.playerId}
                  className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-[#F7F6F0]/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#DCE8DF] text-[#123C2A] font-mono text-xs font-bold shrink-0 tabular-nums">
                      #{entry.rank}
                    </span>
                    <div className="min-w-0">
                      <Link
                        to={`/arcade/players/${entry.playerId}`}
                        className="text-sm font-medium text-[#202A24] hover:text-[#123C2A] hover:underline truncate block"
                      >
                        {entry.playerNickname}
                      </Link>
                      <p className="text-[11px] text-[#758078] truncate">
                        {entry.gamesScoredCount} game{entry.gamesScoredCount === 1 ? '' : 's'} ·{' '}
                        {entry.gameBreakdown
                          .slice(0, 2)
                          .map((b) => `${b.gameName} #${b.rank}`)
                          .join(', ')}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold text-[#123C2A] tabular-nums shrink-0">
                    {entry.totalPoints} pts
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden min-w-0">
          <div className="px-4 sm:px-5 py-3.5 border-b border-[#E6EAE5] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#202A24]">
                Weekly Overall Championship Preview
              </h3>
              <p className="text-xs text-[#758078] truncate">
                Mon–Sun ({weekBounds.label}, Addis Ababa)
              </p>
            </div>
            <Link
              to="/arcade/leaderboards?period=week&scope=overall"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#123C2A] hover:underline whitespace-nowrap shrink-0"
            >
              Full board
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {weekStandings.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#758078]">
              No valid scores submitted this week yet.
            </div>
          ) : (
            <ul className="divide-y divide-[#E6EAE5]">
              {weekStandings.slice(0, 5).map((entry) => (
                <li
                  key={entry.playerId}
                  className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-[#F7F6F0]/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#DCE8DF] text-[#123C2A] font-mono text-xs font-bold shrink-0 tabular-nums">
                      #{entry.rank}
                    </span>
                    <div className="min-w-0">
                      <Link
                        to={`/arcade/players/${entry.playerId}`}
                        className="text-sm font-medium text-[#202A24] hover:text-[#123C2A] hover:underline truncate block"
                      >
                        {entry.playerNickname}
                      </Link>
                      <p className="text-[11px] text-[#758078] truncate">
                        {entry.gamesScoredCount} game{entry.gamesScoredCount === 1 ? '' : 's'} ·{' '}
                        {entry.firstPlaceCount} first-place finish
                        {entry.firstPlaceCount === 1 ? '' : 'es'}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold text-[#123C2A] tabular-nums shrink-0">
                    {entry.totalPoints} pts
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Recent Player Activity & Recent High Scores */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden min-w-0">
          <div className="px-4 sm:px-5 py-3.5 border-b border-[#E6EAE5] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#202A24]">Recent Player Activity</h3>
              <p className="text-xs text-[#758078] truncate">
                Latest game sessions and score submissions
              </p>
            </div>
            <Link
              to="/arcade/players"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#123C2A] hover:underline whitespace-nowrap shrink-0"
            >
              <Users className="w-3.5 h-3.5" />
              All players
            </Link>
          </div>
          {recentActivity.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#758078]">
              No player activity recorded in Supabase yet.
            </div>
          ) : (
            <ul className="divide-y divide-[#E6EAE5]">
              {recentActivity.map((item) => (
                <li
                  key={item.id}
                  className="px-4 sm:px-5 py-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 text-xs leading-relaxed">
                    <Link
                      to={`/arcade/players/${item.playerId}`}
                      className="font-semibold text-[#123C2A] hover:underline"
                    >
                      {item.playerName}
                    </Link>{' '}
                    <span className="text-[#5C665F]">{item.description}</span>
                    {item.badge && item.badge !== 'Valid' && (
                      <span className="ml-1.5">
                        <StatusBadge status={item.badge} />
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#758078] font-mono tabular-nums whitespace-nowrap shrink-0">
                    {formatTimeAgo(item.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden min-w-0">
          <div className="px-4 sm:px-5 py-3.5 border-b border-[#E6EAE5] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-[#202A24]">Recent High Scores</h3>
              <p className="text-xs text-[#758078] truncate">
                Highest verified scores from recent runs
              </p>
            </div>
            <Link
              to="/arcade/competitions"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#123C2A] hover:underline whitespace-nowrap shrink-0"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Competitions
            </Link>
          </div>
          {recentHighScores.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#758078]">
              No verified scores submitted yet.
            </div>
          ) : (
            <ul className="divide-y divide-[#E6EAE5]">
              {recentHighScores.map((s) => {
                const player = playerMap.get(s.playerId);
                const game = gameMap.get(s.gameId);
                return (
                  <li
                    key={s.id}
                    className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-[#F7F6F0]/60"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Gamepad2 className="w-3.5 h-3.5 text-[#123C2A] shrink-0" />
                        <Link
                          to={`/arcade/players/${s.playerId}`}
                          className="text-sm font-medium text-[#202A24] hover:text-[#123C2A] hover:underline truncate"
                        >
                          {player?.nickname ?? 'Player'}
                        </Link>
                      </div>
                      <p className="text-[11px] text-[#758078] mt-0.5 truncate">
                        {game?.name ?? 'Arcade Game'} · {formatAddisDateTime(s.submittedAt)}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-bold text-[#123C2A] tabular-nums shrink-0">
                      {s.score.toLocaleString()} {game?.scoreUnit ?? 'pts'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
