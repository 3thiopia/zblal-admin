import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useApp } from '../../context/AppContext';
import { ServicePriorityRecord } from '../../types';

interface EditPriorityModalProps {
  priority: ServicePriorityRecord | null;
  open: boolean;
  onClose: () => void;
  onSaved?: (priorityName: string, priceEtb: number) => void;
}

export function EditPriorityModal({
  priority,
  open,
  onClose,
  onSaved,
}: EditPriorityModalProps) {
  const { updateServicePriority } = useApp();

  const [nameEn, setNameEn] = useState('');
  const [nameAm, setNameAm] = useState('');
  const [priceEtb, setPriceEtb] = useState('');
  const [minHours, setMinHours] = useState('');
  const [maxHours, setMaxHours] = useState('');
  const [displayOrder, setDisplayOrder] = useState('1');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && priority) {
      setNameEn(priority.nameEn);
      setNameAm(priority.nameAm);
      setPriceEtb(String(priority.priceEtb));
      setMinHours(priority.minHours > 0 ? String(priority.minHours) : '24');
      setMaxHours(priority.maxHours > 0 ? String(priority.maxHours) : '48');
      setDisplayOrder(String(priority.displayOrder || 1));
      setIsActive(priority.active);
      setError('');
      setSaving(false);
    }
  }, [open, priority]);

  if (!priority) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const trimmedEn = nameEn.trim();
    const trimmedAm = nameAm.trim();
    const parsedPrice = Number(priceEtb);
    const parsedMin = Number(minHours);
    const parsedMax = Number(maxHours);
    const parsedOrder = Number(displayOrder);

    if (!trimmedEn) {
      setError('Service name in English is required.');
      return;
    }
    if (!trimmedAm) {
      setError('Service name in Amharic is required.');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('Price (ETB) must be a valid positive number.');
      return;
    }
    if (!Number.isFinite(parsedMin) || parsedMin <= 0) {
      setError('Minimum timeframe (hours) must be a valid positive number.');
      return;
    }
    if (!Number.isFinite(parsedMax) || parsedMax <= 0) {
      setError('Maximum timeframe (hours) must be a valid positive number.');
      return;
    }
    if (parsedMax < parsedMin) {
      setError('Maximum hours must be greater than or equal to minimum hours.');
      return;
    }
    if (!Number.isFinite(parsedOrder) || !Number.isInteger(parsedOrder) || parsedOrder < 1) {
      setError('Display order must be a positive whole number (1 or higher).');
      return;
    }

    setError('');
    setSaving(true);
    try {
      await updateServicePriority({
        id: priority.id,
        nameEn: trimmedEn,
        nameAm: trimmedAm,
        priceEtb: parsedPrice,
        minHours: parsedMin,
        maxHours: parsedMax,
        isActive,
        displayOrder: parsedOrder,
      });
      onSaved?.(trimmedEn, Math.round(parsedPrice));
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save changes to service_priorities.'
      );
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
      title={`Edit Service Pricing — ${priority.nameEn}`}
      subtitle="Saved directly to public.service_priorities. Historical requests keep their saved price snapshots."
      size="lg"
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
            form="edit-priority-form"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </>
      }
    >
      <form id="edit-priority-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="p-3 text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-lg"
          >
            {error}
          </div>
        )}

        <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-[#758078]">Service Code: </span>
            <span className="font-mono font-semibold text-[#202A24]">{priority.code}</span>
          </div>
          <span className="text-[11px] text-[#758078]">
            Code and ID remain unchanged
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="priority-name-en"
              className="block text-xs font-medium text-[#202A24] mb-1"
            >
              Service Name (English) <span className="text-[#B91C1C]">*</span>
            </label>
            <input
              id="priority-name-en"
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              disabled={saving}
              placeholder="e.g. Standard"
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A] disabled:bg-[#F7F6F0]"
            />
          </div>

          <div>
            <label
              htmlFor="priority-name-am"
              className="block text-xs font-medium text-[#202A24] mb-1"
            >
              Service Name (Amharic) <span className="text-[#B91C1C]">*</span>
            </label>
            <input
              id="priority-name-am"
              type="text"
              value={nameAm}
              onChange={(e) => setNameAm(e.target.value)}
              disabled={saving}
              placeholder="e.g. መደበኛ"
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A] disabled:bg-[#F7F6F0]"
            />
          </div>

          <div>
            <label
              htmlFor="priority-price-etb"
              className="block text-xs font-medium text-[#202A24] mb-1"
            >
              Price (ETB) <span className="text-[#B91C1C]">*</span>
            </label>
            <input
              id="priority-price-etb"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={priceEtb}
              onChange={(e) => setPriceEtb(e.target.value)}
              disabled={saving}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A] disabled:bg-[#F7F6F0]"
            />
          </div>

          <div>
            <label
              htmlFor="priority-display-order"
              className="block text-xs font-medium text-[#202A24] mb-1"
            >
              Display Order <span className="text-[#B91C1C]">*</span>
            </label>
            <input
              id="priority-display-order"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              disabled={saving}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A] disabled:bg-[#F7F6F0]"
            />
          </div>

          <div>
            <label
              htmlFor="priority-min-hours"
              className="block text-xs font-medium text-[#202A24] mb-1"
            >
              Minimum Timeframe (Hours) <span className="text-[#B91C1C]">*</span>
            </label>
            <input
              id="priority-min-hours"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={minHours}
              onChange={(e) => setMinHours(e.target.value)}
              disabled={saving}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A] disabled:bg-[#F7F6F0]"
            />
          </div>

          <div>
            <label
              htmlFor="priority-max-hours"
              className="block text-xs font-medium text-[#202A24] mb-1"
            >
              Maximum Timeframe (Hours) <span className="text-[#B91C1C]">*</span>
            </label>
            <input
              id="priority-max-hours"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={maxHours}
              onChange={(e) => setMaxHours(e.target.value)}
              disabled={saving}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A] disabled:bg-[#F7F6F0]"
            />
          </div>
        </div>

        <label className="flex items-start justify-between gap-4 p-3.5 bg-[#F7F6F0]/70 border border-[#E6EAE5] rounded-xl cursor-pointer">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#202A24]">
              Active Service Tier (<span className="font-mono">is_active</span>)
            </p>
            <p className="text-xs text-[#758078] mt-0.5 leading-relaxed">
              When inactive, this tier is hidden from customer registration while remaining intact for historical requests.
            </p>
          </div>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={saving}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#123C2A]"
          />
        </label>
      </form>
    </Modal>
  );
}
