import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Loader2, Trophy } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { StatusBadge } from '../ui/StatusBadge';
import { useArcade } from '../../context/ArcadeContext';
import { ArcadeCompetition } from '../../types/arcade';
import { computeGameLeaderboard, computeOverallStandings } from '../../utils/arcadeScoring';
import { formatAddisDateTime } from '../../utils/arcadeTime';

interface CompetitionStandingsModalProps {
  open: boolean;
  onClose: () => void;
  competition: ArcadeCompetition | null;
}

export function CompetitionStandingsModal({
  open,
  onClose,
  competition,
}: CompetitionStandingsModalProps) {
  const { games, competitionGames, scores, players, winners, nominateWinner } = useArcade();
  const [selectedScope, setSelectedScope] = useState<'overall' | string>('overall');
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const participatingGames = useMemo(() => {
    if (!competition) return [];
    const attachedIds = new Set(
      competitionGames
        .filter((cg) => cg.competitionId === competition.id)
        .map((cg) => cg.gameId)
    );
    if (attachedIds.size === 0) return games.filter((g) => g.isActive);
    return games.filter((g) => attachedIds.has(g.id));
  }, [competition, competitionGames, games]);

  const bounds = useMemo(() => {
    if (!competition) return null;
    const startMs = new Date(competition.startsAt).getTime();
    const endMs = new Date(competition.endsAt).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
    return { startMs, endMs };
  }, [competition]);

  const overallStandings = useMemo(() => {
    if (!competition) return [];
    return computeOverallStandings({
      games: participatingGames,
      scores,
      players,
      bounds,
    });
  }, [competition, participatingGames, scores, players, bounds]);

  const activeGame = participatingGames.find((g) => g.id === selectedScope);
  const gameStandings = useMemo(() => {
    if (!competition || !activeGame) return [];
    return computeGameLeaderboard({
      game: activeGame,
      scores,
      players,
      bounds,
    });
  }, [competition, activeGame, scores, players, bounds]);

  if (!competition) return null;

  const isAlreadyNominated = (playerId: string, gameId?: string) =>
    winners.some(
      (w) =>
        w.competitionId === competition.id &&
        w.playerId === playerId &&
        (w.gameId ?? '') === (gameId ?? '')
    );

  const handleQueueWinner = async (params: {
    key: string;
    playerId: string;
    gameId?: string;
    rank: number;
    finalScore: number;
    overallPoints: number;
  }) => {
    setSubmittingId(params.key);
    try {
      await nominateWinner({
        competitionId: competition.id,
        playerId: params.playerId,
        gameId: params.gameId,
        rank: params.rank,
        finalScore: params.finalScore,
        overallPoints: params.overallPoints,
      });
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Standings — ${competition.name}`}
      subtitle={`${competition.competitionType === 'weekly' ? 'Weekly' : 'Daily'} · ${formatAddisDateTime(
        competition.startsAt
      )} to ${formatAddisDateTime(competition.endsAt)} (Addis Ababa)`}
      size="xl"
      footer={
        <>
          <Link
            to="/arcade/winners"
            onClick={onClose}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-[#123C2A] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0]"
          >
            <Award className="w-4 h-4" />
            <span>Open Winners &amp; Rewards</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21]"
          >
            Close
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg text-xs text-[#5C665F] flex flex-wrap items-center justify-between gap-2">
          <span>
            Overall placement points: 1st = 100, 2nd = 80, 3rd = 60, 4th = 40, 5th = 20.
          </span>
          <StatusBadge status={competition.status} />
        </div>

        {/* Scope selector tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedScope('overall')}
            className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium whitespace-nowrap shrink-0 border transition-colors ${
              selectedScope === 'overall'
                ? 'bg-[#123C2A] text-white border-[#123C2A]'
                : 'bg-white text-[#202A24] border-[#E6EAE5] hover:bg-[#F7F6F0]'
            }`}
          >
            Overall Standings ({overallStandings.length})
          </button>
          {participatingGames.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedScope(g.id)}
              className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-medium whitespace-nowrap shrink-0 border transition-colors ${
                selectedScope === g.id
                  ? 'bg-[#123C2A] text-white border-[#123C2A]'
                  : 'bg-white text-[#202A24] border-[#E6EAE5] hover:bg-[#F7F6F0]'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>

        {selectedScope === 'overall' ? (
          overallStandings.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#758078] bg-[#F7F6F0]/60 border border-[#E6EAE5] rounded-xl">
              No valid scores recorded within this competition window yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {overallStandings.map((entry) => {
                const nominated = isAlreadyNominated(entry.playerId, undefined);
                const key = `overall-${entry.playerId}`;
                return (
                  <div
                    key={entry.playerId}
                    className="p-3.5 bg-white border border-[#E6EAE5] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md bg-[#DCE8DF] text-[#123C2A] font-mono text-xs font-bold tabular-nums">
                          #{entry.rank}
                        </span>
                        <Link
                          to={`/arcade/players/${entry.playerId}`}
                          onClick={onClose}
                          className="text-sm font-semibold text-[#202A24] hover:text-[#123C2A] hover:underline truncate"
                        >
                          {entry.playerNickname}
                        </Link>
                        {entry.isTied && (
                          <span className="text-[11px] font-medium text-[#92400E] bg-[#FEF3C7] px-2 py-0.5 rounded">
                            Tied
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#758078] flex flex-wrap gap-x-2 gap-y-0.5">
                        {entry.gameBreakdown.map((gb) => (
                          <span key={gb.gameId}>
                            {gb.gameName}: #{gb.rank} ({gb.placementPoints} pts)
                          </span>
                        ))}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-left sm:text-right">
                        <p className="font-mono text-base font-bold text-[#123C2A] tabular-nums">
                          {entry.totalPoints} pts
                        </p>
                        <p className="text-[11px] text-[#758078]">
                          {entry.gamesScoredCount} game{entry.gamesScoredCount === 1 ? '' : 's'}
                        </p>
                      </div>

                      {entry.rank <= 3 && (
                        <button
                          type="button"
                          disabled={nominated || submittingId === key}
                          onClick={() =>
                            void handleQueueWinner({
                              key,
                              playerId: entry.playerId,
                              rank: entry.rank,
                              finalScore: entry.gameBreakdown[0]?.bestScore ?? 0,
                              overallPoints: entry.totalPoints,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg border border-[#E6EAE5] bg-[#F7F6F0] text-[#123C2A] hover:bg-[#DCE8DF]/60 disabled:opacity-50"
                        >
                          {submittingId === key ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trophy className="w-3.5 h-3.5" />
                          )}
                          <span>{nominated ? 'Queued' : 'Queue Winner'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : gameStandings.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#758078] bg-[#F7F6F0]/60 border border-[#E6EAE5] rounded-xl">
            No valid scores recorded for {activeGame?.name ?? 'this game'} in this window yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {gameStandings.map((entry) => {
              const nominated = isAlreadyNominated(entry.playerId, entry.gameId);
              const key = `${entry.gameId}-${entry.playerId}`;
              return (
                <div
                  key={entry.playerId}
                  className="p-3.5 bg-white border border-[#E6EAE5] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md bg-[#DCE8DF] text-[#123C2A] font-mono text-xs font-bold tabular-nums">
                        #{entry.rank}
                      </span>
                      <Link
                        to={`/arcade/players/${entry.playerId}`}
                        onClick={onClose}
                        className="text-sm font-semibold text-[#202A24] hover:text-[#123C2A] hover:underline truncate"
                      >
                        {entry.playerNickname}
                      </Link>
                      {entry.isTied && (
                        <span className="text-[11px] font-medium text-[#92400E] bg-[#FEF3C7] px-2 py-0.5 rounded">
                          Tied
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#758078] mt-1 font-mono">
                      {formatAddisDateTime(entry.submittedAt)} · {entry.attemptsCount} attempt
                      {entry.attemptsCount === 1 ? '' : 's'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="font-mono text-base font-bold text-[#202A24] tabular-nums">
                        {entry.bestScore.toLocaleString()} {entry.scoreUnit}
                      </p>
                      <p className="text-[11px] text-[#123C2A] font-mono font-semibold">
                        +{entry.placementPoints} placement pts
                      </p>
                    </div>

                    {entry.rank === 1 && (
                      <button
                        type="button"
                        disabled={nominated || submittingId === key}
                        onClick={() =>
                          void handleQueueWinner({
                            key,
                            playerId: entry.playerId,
                            gameId: entry.gameId,
                            rank: entry.rank,
                            finalScore: entry.bestScore,
                            overallPoints: entry.placementPoints,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg border border-[#E6EAE5] bg-[#F7F6F0] text-[#123C2A] hover:bg-[#DCE8DF]/60 disabled:opacity-50"
                      >
                        {submittingId === key ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trophy className="w-3.5 h-3.5" />
                        )}
                        <span>{nominated ? 'Queued' : 'Queue Winner'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
