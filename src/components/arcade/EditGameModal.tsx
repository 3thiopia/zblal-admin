import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useArcade } from '../../context/ArcadeContext';
import { ArcadeGame } from '../../types/arcade';

interface EditGameModalProps {
  game: ArcadeGame | null;
  open: boolean;
  onClose: () => void;
}

export function EditGameModal({ game, open, onClose }: EditGameModalProps) {
  const { updateGame } = useArcade();

  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState('1');
  const [isActive, setIsActive] = useState(true);
  const [isComingSoon, setIsComingSoon] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && game) {
      setDescription(game.description);
      setDisplayOrder(String(game.displayOrder || 1));
      setIsActive(game.isActive);
      setIsComingSoon(game.isComingSoon);
      setError('');
      setSaving(false);
    }
  }, [open, game]);

  if (!game) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const orderNum = Number(displayOrder);
    if (!Number.isFinite(orderNum) || !Number.isInteger(orderNum) || orderNum < 1) {
      setError('Display order must be a whole number of 1 or higher.');
      return;
    }

    setError('');
    setSaving(true);
    try {
      await updateGame({
        id: game.id,
        description: description.trim(),
        displayOrder: orderNum,
        isActive,
        isComingSoon,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save game details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={`Manage Game — ${game.name}`}
      subtitle="Game ID and slug remain immutable so historical scores stay intact."
      size="md"
      footer={
        <>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#202A24] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-arcade-game-form"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{saving ? 'Saving...' : 'Save Game'}</span>
          </button>
        </>
      }
    >
      <form id="edit-arcade-game-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="p-3 text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-lg"
          >
            {error}
          </div>
        )}

        <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
          <span>
            <span className="text-[#758078]">Slug: </span>
            <span className="font-mono font-semibold text-[#202A24]">{game.slug}</span>
          </span>
          <span className="text-[11px] text-[#758078]">Historical ID preserved</span>
        </div>

        <div>
          <label htmlFor="game-display-order" className="block text-xs font-medium text-[#202A24] mb-1">
            Display Order
          </label>
          <input
            id="game-display-order"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            disabled={saving}
            className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
          />
        </div>

        <div>
          <label htmlFor="game-description" className="block text-xs font-medium text-[#202A24] mb-1">
            Game Description
          </label>
          <textarea
            id="game-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
            placeholder="Describe gameplay and how scores are earned..."
            className="w-full px-3 py-2 text-sm bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
          />
        </div>

        <div className="space-y-2.5">
          <label className="flex items-start justify-between gap-4 p-3.5 bg-[#F7F6F0]/70 border border-[#E6EAE5] rounded-xl cursor-pointer">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#202A24]">Active &amp; Playable</p>
              <p className="text-xs text-[#758078] mt-0.5">
                Players can launch sessions and submit official scores.
              </p>
            </div>
            <input
              type="checkbox"
              checked={isActive && !isComingSoon}
              onChange={(e) => {
                setIsActive(e.target.checked);
                if (e.target.checked) setIsComingSoon(false);
              }}
              disabled={saving}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#123C2A]"
            />
          </label>

          <label className="flex items-start justify-between gap-4 p-3.5 bg-[#F7F6F0]/70 border border-[#E6EAE5] rounded-xl cursor-pointer">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#202A24]">Mark as Coming Soon</p>
              <p className="text-xs text-[#758078] mt-0.5">
                Displays the game as upcoming while preventing new play sessions.
              </p>
            </div>
            <input
              type="checkbox"
              checked={isComingSoon}
              onChange={(e) => {
                setIsComingSoon(e.target.checked);
                if (e.target.checked) setIsActive(false);
              }}
              disabled={saving}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#123C2A]"
            />
          </label>
        </div>
      </form>
    </Modal>
  );
}
