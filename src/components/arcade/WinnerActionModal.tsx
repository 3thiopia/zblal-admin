import { useEffect, useState } from 'react';
import { Award, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { StatusBadge } from '../ui/StatusBadge';
import { useArcade } from '../../context/ArcadeContext';
import { ArcadeWinner } from '../../types/arcade';

interface WinnerActionModalProps {
  winner: ArcadeWinner | null;
  open: boolean;
  onClose: () => void;
}

export function WinnerActionModal({ winner, open, onClose }: WinnerActionModalProps) {
  const {
    players,
    competitions,
    games,
    reviewWinner,
    updateWinnerNotes,
    markWinnerPrizeAwarded,
  } = useArcade();

  const [notes, setNotes] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && winner) {
      setNotes(winner.internalNotes ?? '');
      setError('');
      setBusyAction(null);
    }
  }, [open, winner]);

  if (!winner) return null;

  const player = players.find((p) => p.id === winner.playerId);
  const competition = competitions.find((c) => c.id === winner.competitionId);
  const game = winner.gameId ? games.find((g) => g.id === winner.gameId) : undefined;

  const runAction = async (actionKey: string, fn: () => Promise<void>, closeAfter = false) => {
    setError('');
    setBusyAction(actionKey);
    try {
      await fn();
      if (closeAfter) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update winner record.');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busyAction) onClose();
      }}
      title={`Review Winner — ${player?.nickname ?? 'Player'}`}
      subtitle={`${competition?.name ?? 'Competition'} · ${
        game ? game.name : 'Overall Championship'
      }`}
      size="lg"
      footer={
        <>
          <button
            type="button"
            disabled={Boolean(busyAction)}
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#202A24] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0] disabled:opacity-50"
          >
            Close
          </button>
          <button
            type="button"
            disabled={Boolean(busyAction)}
            onClick={() =>
              void runAction('notes', () => updateWinnerNotes(winner.id, notes), true)
            }
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] disabled:opacity-50"
          >
            {busyAction === 'notes' && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Save Notes</span>
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div
            role="alert"
            className="p-3 text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-lg"
          >
            {error}
          </div>
        )}

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg">
            <dt className="text-[#758078]">Rank</dt>
            <dd className="font-mono font-bold text-[#123C2A] text-sm mt-0.5">#{winner.rank}</dd>
          </div>
          <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg">
            <dt className="text-[#758078]">Final Score</dt>
            <dd className="font-mono font-semibold text-[#202A24] text-sm mt-0.5 tabular-nums">
              {winner.finalScore.toLocaleString()}
            </dd>
          </div>
          <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg">
            <dt className="text-[#758078]">Overall Points</dt>
            <dd className="font-mono font-semibold text-[#202A24] text-sm mt-0.5 tabular-nums">
              {winner.overallPoints.toLocaleString()}
            </dd>
          </div>
          <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg">
            <dt className="text-[#758078]">Player Phone</dt>
            <dd className="font-mono text-[#202A24] mt-0.5 break-all">
              {player?.phone_e164 || '—'}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-[#E6EAE5] rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#758078]">Approval:</span>
            <StatusBadge status={winner.approvalStatus} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#758078]">Prize Status:</span>
            <StatusBadge status={winner.prizeStatus} />
          </div>
        </div>

        <div>
          <label htmlFor="winner-internal-notes" className="block text-xs font-medium text-[#202A24] mb-1">
            Internal Verification &amp; Fulfillment Notes
          </label>
          <textarea
            id="winner-internal-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={Boolean(busyAction)}
            placeholder="Record phone verification details, prize voucher reference, or rejection reason..."
            className="w-full px-3 py-2 text-sm bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
          />
        </div>

        <div className="pt-2 border-t border-[#E6EAE5] space-y-2.5">
          <p className="text-xs font-semibold text-[#202A24]">Winner Review &amp; Prize Actions</p>
          <p className="text-[11px] text-[#758078]">
            Approving a winner never marks the prize as awarded automatically. Only mark a prize as awarded after physical or digital delivery is confirmed.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              disabled={Boolean(busyAction) || winner.approvalStatus === 'Approved'}
              onClick={() =>
                void runAction('approve', () => reviewWinner(winner.id, 'Approved', notes))
              }
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-3 py-2 text-xs font-semibold text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] disabled:opacity-45"
            >
              {busyAction === 'approve' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Approve Winner</span>
            </button>

            <button
              type="button"
              disabled={Boolean(busyAction) || winner.approvalStatus === 'Rejected'}
              onClick={() =>
                void runAction('reject', () => reviewWinner(winner.id, 'Rejected', notes))
              }
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-3 py-2 text-xs font-semibold text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-lg hover:bg-[#FECACA]/70 disabled:opacity-45"
            >
              {busyAction === 'reject' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              <span>Reject Winner</span>
            </button>

            <button
              type="button"
              disabled={
                Boolean(busyAction) ||
                winner.approvalStatus !== 'Approved' ||
                winner.prizeStatus === 'Awarded'
              }
              onClick={() =>
                void runAction('award', () => markWinnerPrizeAwarded(winner.id, notes))
              }
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-3 py-2 text-xs font-semibold text-[#123C2A] bg-[#DCE8DF] border border-[#C3D9C9] rounded-lg hover:bg-[#C3D9C9]/70 disabled:opacity-45"
            >
              {busyAction === 'award' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Award className="w-3.5 h-3.5" />
              )}
              <span>
                {winner.prizeStatus === 'Awarded' ? 'Prize Awarded' : 'Mark Prize Awarded'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
