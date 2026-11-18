import {
  ArcadeGame,
  ArcadeGameLeaderboardEntry,
  ArcadeGameSession,
  ArcadeOverallStandingEntry,
  ArcadePlayer,
  ArcadeScore,
} from '../types/arcade';
import {
  AddisPeriodBounds,
  getAddisDateParts,
  getAddisDayBounds,
  getAddisWeekBounds,
  isTimestampInBounds,
} from './arcadeTime';

export const PLACEMENT_POINTS_BY_RANK: Record<number, number> = {
  1: 100,
  2: 80,
  3: 60,
  4: 40,
  5: 20,
};

export function getPlacementPointsForRank(rank: number): number {
  return PLACEMENT_POINTS_BY_RANK[rank] ?? 0;
}

export type LeaderboardPeriodFilter = 'today' | 'week' | 'all' | 'custom';

export function resolveBoundsForPeriod(
  period: LeaderboardPeriodFilter,
  customBounds?: { startMs: number; endMs: number } | null,
  referenceDate: Date = new Date()
): Pick<AddisPeriodBounds, 'startMs' | 'endMs'> | null {
  if (period === 'today') return getAddisDayBounds(referenceDate, 0);
  if (period === 'week') return getAddisWeekBounds(referenceDate, 0);
  if (period === 'custom' && customBounds) return customBounds;
  return null;
}

/**
 * Computes per-game leaderboard using valid scores within optional period bounds.
 * Each player receives their highest valid score in that game for the period.
 * Standard competition ranking (1, 1, 3, ...) handles ties transparently: tied players
 * share the same rank and earn the exact same placement points.
 */
export function computeGameLeaderboard(params: {
  game: ArcadeGame;
  scores: ArcadeScore[];
  players: ArcadePlayer[];
  bounds?: Pick<AddisPeriodBounds, 'startMs' | 'endMs'> | null;
}): ArcadeGameLeaderboardEntry[] {
  const { game, scores, players, bounds } = params;
  const playerMap = new Map(players.map((p) => [p.id, p]));

  interface BestPerPlayer {
    bestScore: number;
    submittedAt: string;
    submittedMs: number;
    validationStatus: ArcadeScore['validationStatus'];
    attemptsCount: number;
  }

  const bestByPlayer = new Map<string, BestPerPlayer>();

  for (const s of scores) {
    if (s.gameId !== game.id) continue;
    if (!s.isValid) continue;
    if (bounds && !isTimestampInBounds(s.submittedAt, bounds)) continue;

    const ms = new Date(s.submittedAt).getTime();
    const safeMs = Number.isNaN(ms) ? 0 : ms;
    const prev = bestByPlayer.get(s.playerId);

    if (!prev) {
      bestByPlayer.set(s.playerId, {
        bestScore: s.score,
        submittedAt: s.submittedAt,
        submittedMs: safeMs,
        validationStatus: s.validationStatus,
        attemptsCount: 1,
      });
    } else {
      prev.attemptsCount += 1;
      if (s.score > prev.bestScore || (s.score === prev.bestScore && safeMs < prev.submittedMs)) {
        prev.bestScore = s.score;
        prev.submittedAt = s.submittedAt;
        prev.submittedMs = safeMs;
        prev.validationStatus = s.validationStatus;
      }
    }
  }

  const sorted = Array.from(bestByPlayer.entries()).sort(([, a], [, b]) => {
    if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
    return a.submittedMs - b.submittedMs;
  });

  // Count frequencies of scores to detect ties cleanly
  const scoreCounts = new Map<number, number>();
  for (const [, entry] of sorted) {
    scoreCounts.set(entry.bestScore, (scoreCounts.get(entry.bestScore) ?? 0) + 1);
  }

  const result: ArcadeGameLeaderboardEntry[] = [];
  let currentRank = 1;

  sorted.forEach(([playerId, item], idx) => {
    if (idx > 0 && item.bestScore < sorted[idx - 1][1].bestScore) {
      currentRank = idx + 1;
    }
    const player = playerMap.get(playerId);
    const isTied = (scoreCounts.get(item.bestScore) ?? 0) > 1;
    result.push({
      rank: currentRank,
      isTied,
      placementPoints: getPlacementPointsForRank(currentRank),
      playerId,
      playerNickname: player?.nickname || 'Unknown Player',
      playerPhone: player?.phone_e164 || '—',
      playerStatus: player?.status ?? 'Active',
      gameId: game.id,
      gameName: game.name,
      bestScore: item.bestScore,
      scoreUnit: game.scoreUnit,
      submittedAt: item.submittedAt,
      validationStatus: item.validationStatus,
      attemptsCount: item.attemptsCount,
    });
  });

  return result;
}

/**
 * Computes Overall Arcade Standings by summing placement points across participating games.
 * Never sums raw scores across games.
 */
export function computeOverallStandings(params: {
  games: ArcadeGame[];
  scores: ArcadeScore[];
  players: ArcadePlayer[];
  bounds?: Pick<AddisPeriodBounds, 'startMs' | 'endMs'> | null;
}): ArcadeOverallStandingEntry[] {
  const { games, scores, players, bounds } = params;
  const playerMap = new Map(players.map((p) => [p.id, p]));

  interface PlayerAggregate {
    playerId: string;
    totalPoints: number;
    firstPlaceCount: number;
    bestPlacement: number;
    latestAchievedMs: number;
    latestAchievedAt: string;
    gameBreakdown: ArcadeOverallStandingEntry['gameBreakdown'];
  }

  const aggByPlayer = new Map<string, PlayerAggregate>();

  for (const game of games) {
    const gameBoard = computeGameLeaderboard({ game, scores, players, bounds });
    for (const entry of gameBoard) {
      let agg = aggByPlayer.get(entry.playerId);
      if (!agg) {
        agg = {
          playerId: entry.playerId,
          totalPoints: 0,
          firstPlaceCount: 0,
          bestPlacement: Number.POSITIVE_INFINITY,
          latestAchievedMs: 0,
          latestAchievedAt: entry.submittedAt,
          gameBreakdown: [],
        };
        aggByPlayer.set(entry.playerId, agg);
      }

      agg.totalPoints += entry.placementPoints;
      if (entry.rank === 1) agg.firstPlaceCount += 1;
      if (entry.rank < agg.bestPlacement) agg.bestPlacement = entry.rank;

      const ms = new Date(entry.submittedAt).getTime();
      if (!Number.isNaN(ms) && ms > agg.latestAchievedMs) {
        agg.latestAchievedMs = ms;
        agg.latestAchievedAt = entry.submittedAt;
      }

      agg.gameBreakdown.push({
        gameId: game.id,
        gameName: game.name,
        rank: entry.rank,
        bestScore: entry.bestScore,
        placementPoints: entry.placementPoints,
        isTied: entry.isTied,
      });
    }
  }

  const sorted = Array.from(aggByPlayer.values()).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.firstPlaceCount !== a.firstPlaceCount) return b.firstPlaceCount - a.firstPlaceCount;
    if (a.bestPlacement !== b.bestPlacement) return a.bestPlacement - b.bestPlacement;
    if (b.gameBreakdown.length !== a.gameBreakdown.length) {
      return b.gameBreakdown.length - a.gameBreakdown.length;
    }
    return a.latestAchievedMs - b.latestAchievedMs;
  });

  const pointsCounts = new Map<number, number>();
  for (const item of sorted) {
    pointsCounts.set(item.totalPoints, (pointsCounts.get(item.totalPoints) ?? 0) + 1);
  }

  let currentRank = 1;
  return sorted.map((agg, idx) => {
    if (idx > 0 && agg.totalPoints < sorted[idx - 1].totalPoints) {
      currentRank = idx + 1;
    }
    const player = playerMap.get(agg.playerId);
    const isTied = (pointsCounts.get(agg.totalPoints) ?? 0) > 1;
    return {
      rank: currentRank,
      isTied,
      playerId: agg.playerId,
      playerNickname: player?.nickname || 'Unknown Player',
      playerPhone: player?.phone_e164 || '—',
      playerStatus: player?.status ?? 'Active',
      totalPoints: agg.totalPoints,
      gamesScoredCount: agg.gameBreakdown.length,
      firstPlaceCount: agg.firstPlaceCount,
      bestPlacement: agg.bestPlacement === Number.POSITIVE_INFINITY ? 0 : agg.bestPlacement,
      latestAchievedAt: agg.latestAchievedAt,
      gameBreakdown: agg.gameBreakdown.sort((a, b) => b.placementPoints - a.placementPoints || a.rank - b.rank),
    };
  });
}

export interface PlayerComputedSummary {
  totalGamesPlayed: number;
  validScoresCount: number;
  highestScore: number;
  mostPlayedGameId?: string;
  mostPlayedGameName: string;
  lastActivityAt?: string;
}

export function computePlayerSummaries(params: {
  players: ArcadePlayer[];
  games: ArcadeGame[];
  sessions: ArcadeGameSession[];
  scores: ArcadeScore[];
}): Map<string, PlayerComputedSummary> {
  const { players, games, sessions, scores } = params;
  const gameNameMap = new Map(games.map((g) => [g.id, g.name]));
  const result = new Map<string, PlayerComputedSummary>();

  for (const p of players) {
    const playerSessions = sessions.filter((s) => s.playerId === p.id);
    const playerScores = scores.filter((s) => s.playerId === p.id);
    const validScores = playerScores.filter((s) => s.isValid);

    const playCounts = new Map<string, number>();
    if (playerSessions.length > 0) {
      for (const s of playerSessions) {
        playCounts.set(s.gameId, (playCounts.get(s.gameId) ?? 0) + 1);
      }
    } else {
      for (const s of playerScores) {
        playCounts.set(s.gameId, (playCounts.get(s.gameId) ?? 0) + 1);
      }
    }

    let mostPlayedGameId: string | undefined;
    let maxPlays = 0;
    for (const [gid, count] of playCounts.entries()) {
      if (count > maxPlays) {
        maxPlays = count;
        mostPlayedGameId = gid;
      }
    }

    const highestScore =
      validScores.length > 0 ? Math.max(...validScores.map((s) => s.score)) : 0;

    const activityTimestamps: number[] = [];
    if (p.lastActivityAt) {
      const ms = new Date(p.lastActivityAt).getTime();
      if (!Number.isNaN(ms)) activityTimestamps.push(ms);
    }
    for (const s of playerSessions) {
      const ms = new Date(s.endedAt || s.startedAt).getTime();
      if (!Number.isNaN(ms)) activityTimestamps.push(ms);
    }
    for (const s of playerScores) {
      const ms = new Date(s.submittedAt).getTime();
      if (!Number.isNaN(ms)) activityTimestamps.push(ms);
    }
    const regMs = new Date(p.registeredAt).getTime();
    if (!Number.isNaN(regMs)) activityTimestamps.push(regMs);

    const latestMs = activityTimestamps.length > 0 ? Math.max(...activityTimestamps) : 0;

    result.set(p.id, {
      totalGamesPlayed: playerSessions.length > 0 ? playerSessions.length : playerScores.length,
      validScoresCount: validScores.length,
      highestScore,
      mostPlayedGameId,
      mostPlayedGameName: mostPlayedGameId ? gameNameMap.get(mostPlayedGameId) ?? '—' : '—',
      lastActivityAt: latestMs > 0 ? new Date(latestMs).toISOString() : undefined,
    });
  }

  return result;
}

export function buildLast7DaysArcadeTrend(params: {
  sessions: ArcadeGameSession[];
  scores: ArcadeScore[];
  referenceDate?: Date;
}): Array<{ dateKey: string; dayLabel: string; sessions: number; validScores: number }> {
  const { sessions, scores, referenceDate = new Date() } = params;
  const days: Array<{
    dateKey: string;
    dayLabel: string;
    startMs: number;
    endMs: number;
    sessions: number;
    validScores: number;
  }> = [];

  for (let offset = -6; offset <= 0; offset += 1) {
    const bounds = getAddisDayBounds(referenceDate, offset);
    const parts = getAddisDateParts(bounds.startIso);
    const shortLabel = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Addis_Ababa',
      weekday: 'short',
    }).format(new Date(bounds.startIso));
    days.push({
      dateKey: parts.dateKey,
      dayLabel: shortLabel,
      startMs: bounds.startMs,
      endMs: bounds.endMs,
      sessions: 0,
      validScores: 0,
    });
  }

  for (const s of sessions) {
    const ms = new Date(s.startedAt).getTime();
    if (Number.isNaN(ms)) continue;
    const bucket = days.find((d) => ms >= d.startMs && ms < d.endMs);
    if (bucket) bucket.sessions += 1;
  }

  for (const sc of scores) {
    if (!sc.isValid) continue;
    const ms = new Date(sc.submittedAt).getTime();
    if (Number.isNaN(ms)) continue;
    const bucket = days.find((d) => ms >= d.startMs && ms < d.endMs);
    if (bucket) bucket.validScores += 1;
  }

  return days.map(({ dateKey, dayLabel, sessions: sessCount, validScores }) => ({
    dateKey,
    dayLabel,
    sessions: sessCount,
    validScores,
  }));
}
