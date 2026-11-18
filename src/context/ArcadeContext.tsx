import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useApp } from './AppContext';
import { supabase } from '../lib/supabase';
import {
  ArcadeCompetition,
  ArcadeCompetitionGame,
  ArcadeCompetitionStatus,
  ArcadeGame,
  ArcadeGameSession,
  ArcadePlayer,
  ArcadePlayerStatus,
  ArcadeScore,
  ArcadeWinner,
  ArcadeWinnerApprovalStatus,
} from '../types/arcade';
import {
  loadAllArcadeData,
  markWinnerPrizeAwardedRecord,
  recordCompetitionWinnerNomination,
  reviewWinnerRecord,
  saveArcadeCompetitionRecord,
  SaveCompetitionInput,
  updateArcadeGameRecord,
  UpdateArcadeGameInput,
  updateArcadePlayerStatusRecord,
  updateCompetitionStatusRecord,
  updateWinnerNotesRecord,
} from '../services/arcadeService';

interface ArcadeContextValue {
  players: ArcadePlayer[];
  games: ArcadeGame[];
  sessions: ArcadeGameSession[];
  scores: ArcadeScore[];
  competitions: ArcadeCompetition[];
  competitionGames: ArcadeCompetitionGame[];
  winners: ArcadeWinner[];
  loadingArcade: boolean;
  arcadeError: string | null;
  refreshArcadeData: (silent?: boolean) => Promise<void>;
  togglePlayerStatus: (
    playerId: string,
    nextStatus: ArcadePlayerStatus,
    reason?: string
  ) => Promise<void>;
  updateGame: (input: UpdateArcadeGameInput) => Promise<void>;
  saveCompetition: (input: Omit<SaveCompetitionInput, 'staffUserId'>) => Promise<string>;
  changeCompetitionStatus: (
    competitionId: string,
    status: ArcadeCompetitionStatus
  ) => Promise<void>;
  reviewWinner: (
    winnerId: string,
    approvalStatus: ArcadeWinnerApprovalStatus,
    internalNotes?: string
  ) => Promise<void>;
  updateWinnerNotes: (winnerId: string, internalNotes: string) => Promise<void>;
  markWinnerPrizeAwarded: (winnerId: string, internalNotes?: string) => Promise<void>;
  nominateWinner: (params: {
    competitionId: string;
    playerId: string;
    gameId?: string;
    rank: number;
    finalScore: number;
    overallPoints: number;
    internalNotes?: string;
  }) => Promise<void>;
}

const ArcadeContext = createContext<ArcadeContextValue | null>(null);

export function ArcadeProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, staffProfile } = useAuth();
  const { addToast, dataRevision } = useApp();

  const [players, setPlayers] = useState<ArcadePlayer[]>([]);
  const [games, setGames] = useState<ArcadeGame[]>([]);
  const [sessions, setSessions] = useState<ArcadeGameSession[]>([]);
  const [scores, setScores] = useState<ArcadeScore[]>([]);
  const [competitions, setCompetitions] = useState<ArcadeCompetition[]>([]);
  const [competitionGames, setCompetitionGames] = useState<ArcadeCompetitionGame[]>([]);
  const [winners, setWinners] = useState<ArcadeWinner[]>([]);

  const [loadingArcade, setLoadingArcade] = useState<boolean>(false);
  const [arcadeError, setArcadeError] = useState<string | null>(null);

  const refreshArcadeData = useCallback(
    async (silent = false) => {
      if (!isAuthenticated || !staffProfile?.isActive) {
        setPlayers([]);
        setGames([]);
        setSessions([]);
        setScores([]);
        setCompetitions([]);
        setCompetitionGames([]);
        setWinners([]);
        return;
      }

      if (!silent) {
        setLoadingArcade(true);
      }
      setArcadeError(null);
      try {
        const data = await loadAllArcadeData();
        setPlayers(data.players);
        setGames(data.games);
        setSessions(data.sessions);
        setScores(data.scores);
        setCompetitions(data.competitions);
        setCompetitionGames(data.competitionGames);
        setWinners(data.winners);
      } catch (err) {
        setArcadeError(
          err instanceof Error ? err.message : 'Unable to load Arcade data from Supabase.'
        );
      } finally {
        if (!silent) {
          setLoadingArcade(false);
        }
      }
    },
    [isAuthenticated, staffProfile]
  );

  useEffect(() => {
    void refreshArcadeData(false);
  }, [refreshArcadeData, dataRevision]);

  // Automatic silent refresh every 20s + Supabase Realtime (when table grants allow Realtime)
  useEffect(() => {
    if (!isAuthenticated) return;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshArcadeData(true);
      }
    }, 20000);

    const client = supabase;
    let timer: number | null = null;
    const scheduleRefresh = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void refreshArcadeData(true);
      }, 300);
    };

    const channel = client
      ? client
          .channel('zblal-admin-arcade-sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'arcade_players' }, scheduleRefresh)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'arcade_games' }, scheduleRefresh)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'arcade_scores' }, scheduleRefresh)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'arcade_game_sessions' }, scheduleRefresh)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'arcade_competitions' }, scheduleRefresh)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'arcade_competition_games' }, scheduleRefresh)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'arcade_winners' }, scheduleRefresh)
          .subscribe()
      : null;

    return () => {
      window.clearInterval(intervalId);
      if (timer !== null) window.clearTimeout(timer);
      if (client && channel) {
        void client.removeChannel(channel);
      }
    };
  }, [isAuthenticated, refreshArcadeData]);

  const togglePlayerStatus: ArcadeContextValue['togglePlayerStatus'] = async (
    playerId,
    nextStatus,
    reason
  ) => {
    const target = players.find((p) => p.id === playerId);
    try {
      await updateArcadePlayerStatusRecord({ playerId, nextStatus, reason });
      await refreshArcadeData(true);
      addToast(
        nextStatus === 'Suspended' ? 'Player suspended' : 'Player reactivated',
        `${target?.nickname ?? 'Player'} is now ${nextStatus}. Historical scores remain preserved.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update player status.';
      addToast('Update failed', msg, 'error');
      throw err;
    }
  };

  const updateGame: ArcadeContextValue['updateGame'] = async (input) => {
    try {
      await updateArcadeGameRecord(input);
      await refreshArcadeData(true);
      addToast('Game updated', 'Changes saved to public.arcade_games.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update game.';
      addToast('Update failed', msg, 'error');
      throw err;
    }
  };

  const saveCompetition: ArcadeContextValue['saveCompetition'] = async (input) => {
    try {
      const id = await saveArcadeCompetitionRecord({
        ...input,
        staffUserId: staffProfile?.userId,
      });
      await refreshArcadeData(true);
      addToast(
        input.id ? 'Competition updated' : 'Competition created',
        `${input.name.trim()} saved with ${input.gameIds.length} participating game(s).`
      );
      return id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save competition.';
      addToast('Save failed', msg, 'error');
      throw err;
    }
  };

  const changeCompetitionStatus: ArcadeContextValue['changeCompetitionStatus'] = async (
    competitionId,
    status
  ) => {
    const comp = competitions.find((c) => c.id === competitionId);
    try {
      await updateCompetitionStatusRecord(competitionId, status);
      await refreshArcadeData(true);
      addToast(
        'Competition status updated',
        `${comp?.name ?? 'Competition'} is now ${status}.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to change competition status.';
      addToast('Update failed', msg, 'error');
      throw err;
    }
  };

  const reviewWinner: ArcadeContextValue['reviewWinner'] = async (
    winnerId,
    approvalStatus,
    internalNotes
  ) => {
    try {
      await reviewWinnerRecord({
        winnerId,
        approvalStatus,
        internalNotes,
        staffUserId: staffProfile?.userId,
      });
      await refreshArcadeData(true);
      addToast(
        approvalStatus === 'Approved' ? 'Winner approved' : 'Winner rejected',
        approvalStatus === 'Approved'
          ? 'Winner approved. Prize remains pending until explicitly awarded.'
          : 'Winner entry marked as rejected.'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update winner approval.';
      addToast('Update failed', msg, 'error');
      throw err;
    }
  };

  const updateWinnerNotes: ArcadeContextValue['updateWinnerNotes'] = async (
    winnerId,
    internalNotes
  ) => {
    try {
      await updateWinnerNotesRecord(winnerId, internalNotes);
      await refreshArcadeData(true);
      addToast('Notes saved', 'Internal notes updated on public.arcade_winners.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update internal notes.';
      addToast('Save failed', msg, 'error');
      throw err;
    }
  };

  const markWinnerPrizeAwarded: ArcadeContextValue['markWinnerPrizeAwarded'] = async (
    winnerId,
    internalNotes
  ) => {
    const target = winners.find((w) => w.id === winnerId);
    if (!target) throw new Error('Winner record not found.');
    try {
      await markWinnerPrizeAwardedRecord({
        winnerId,
        currentApprovalStatus: target.approvalStatus,
        internalNotes,
        staffUserId: staffProfile?.userId,
      });
      await refreshArcadeData(true);
      addToast('Prize marked as awarded', 'Reward fulfillment recorded in public.arcade_winners.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to mark prize as awarded.';
      addToast('Action failed', msg, 'error');
      throw err;
    }
  };

  const nominateWinner: ArcadeContextValue['nominateWinner'] = async (params) => {
    try {
      await recordCompetitionWinnerNomination(params);
      await refreshArcadeData(true);
      addToast(
        'Winner queued for review',
        'Added to Winners & Rewards with Pending approval and Pending prize status.'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to record winner nomination.';
      addToast('Nomination failed', msg, 'error');
      throw err;
    }
  };

  return (
    <ArcadeContext.Provider
      value={{
        players,
        games,
        sessions,
        scores,
        competitions,
        competitionGames,
        winners,
        loadingArcade,
        arcadeError,
        refreshArcadeData,
        togglePlayerStatus,
        updateGame,
        saveCompetition,
        changeCompetitionStatus,
        reviewWinner,
        updateWinnerNotes,
        markWinnerPrizeAwarded,
        nominateWinner,
      }}
    >
      {children}
    </ArcadeContext.Provider>
  );
}

export function useArcade() {
  const ctx = useContext(ArcadeContext);
  if (!ctx) throw new Error('useArcade must be used inside ArcadeProvider');
  return ctx;
}
