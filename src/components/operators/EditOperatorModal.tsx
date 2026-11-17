import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useApp } from '../../context/AppContext';
import { Operator, OperatorStatus, VehicleType } from '../../types';
import { TRUCK_HEAVY_IMAGE, TRUCK_MEDIUM_IMAGE } from '../../lib/assets';

interface EditOperatorModalProps {
  operator: Operator;
  open: boolean;
  onClose: () => void;
}

const VEHICLE_TYPES: VehicleType[] = [
  'Light Vacuum Truck',
  'Medium Tanker',
  'Heavy Vacuum Tanker',
  'Industrial Septic Truck',
];

const AVAILABILITY_OPTIONS: OperatorStatus[] = [
  'Available',
  'Assigned',
  'Busy',
  'Unavailable',
  'Suspended',
];

export function EditOperatorModal({ operator, open, onClose }: EditOperatorModalProps) {
  const { subcities, neighbourhoods, updateOperator } = useApp();

  const [fullName, setFullName] = useState(operator.fullName);
  const [phoneE164, setPhoneE164] = useState(operator.phone_e164);
  const [secondaryPhoneE164, setSecondaryPhoneE164] = useState(
    operator.secondary_phone_e164 ?? ''
  );
  const [vehiclePlate, setVehiclePlate] = useState(operator.vehiclePlate);
  const [vehicleType, setVehicleType] = useState<string>(operator.vehicleType);
  const [tankCapacityLitres, setTankCapacityLitres] = useState(String(operator.tankCapacityLitres));
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState(operator.vehiclePhotoUrl ?? '');
  const [vehicleNotes, setVehicleNotes] = useState(operator.vehicleNotes ?? '');
  const [subcityId, setSubcityId] = useState(operator.subcityId);
  const [neighbourhoodId, setNeighbourhoodId] = useState(operator.neighbourhoodId);
  const [availability, setAvailability] = useState<OperatorStatus>(operator.availability);
  const [internalNotes, setInternalNotes] = useState(operator.internalNotes ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFullName(operator.fullName);
      setPhoneE164(operator.phone_e164);
      setSecondaryPhoneE164(operator.secondary_phone_e164 ?? '');
      setVehiclePlate(operator.vehiclePlate);
      setVehicleType(operator.vehicleType);
      setTankCapacityLitres(String(operator.tankCapacityLitres));
      setVehiclePhotoUrl(operator.vehiclePhotoUrl ?? '');
      setVehicleNotes(operator.vehicleNotes ?? '');
      setSubcityId(operator.subcityId);
      setNeighbourhoodId(operator.neighbourhoodId);
      setAvailability(operator.availability);
      setInternalNotes(operator.internalNotes ?? '');
      setError('');
    }
  }, [open, operator]);

  const availableNeighbourhoods = useMemo(
    () => neighbourhoods.filter((n) => n.subcityId === subcityId),
    [neighbourhoods, subcityId]
  );

  const handleSubcityChange = (newSubId: string) => {
    setSubcityId(newSubId);
    const first = neighbourhoods.find((n) => n.subcityId === newSubId);
    setNeighbourhoodId(first?.id ?? '');
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setVehiclePhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedPhone = phoneE164.replace(/\s+/g, '');
    const capacity = Number(tankCapacityLitres);

    if (fullName.trim().length < 3) {
      setError('Full name must be at least 3 characters.');
      return;
    }
    if (!/^(\+251|0)9\d{8}$/.test(cleanedPhone)) {
      setError('Enter a valid Ethiopian primary phone number (e.g. +251 911 482 910).');
      return;
    }
    if (vehiclePlate.trim().length < 4) {
      setError('Vehicle plate number is required.');
      return;
    }
    if (!Number.isFinite(capacity) || capacity < 2000 || capacity > 40000) {
      setError('Tank capacity must be between 2,000 and 40,000 litres.');
      return;
    }

    const subcity = subcities.find((s) => s.id === subcityId);
    const neighbourhood = neighbourhoods.find((n) => n.id === neighbourhoodId);

    setError('');
    setSaving(true);
    try {
      await updateOperator(operator.id, {
        fullName: fullName.trim(),
        phone_e164: phoneE164.trim(),
        secondary_phone_e164: secondaryPhoneE164.trim() || undefined,
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        vehicleType,
        tankCapacityLitres: capacity,
        vehiclePhotoUrl: vehiclePhotoUrl || undefined,
        vehicleNotes: vehicleNotes.trim() || undefined,
        subcityId,
        subcityName: subcity?.nameEn ?? operator.subcityName,
        neighbourhoodId,
        neighbourhoodName: neighbourhood?.nameEn ?? operator.neighbourhoodName,
        availability,
        internalNotes: internalNotes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit Operator — ${operator.fullName}`}
      size="xl"
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
            form="edit-operator-form"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </>
      }
    >
      <form id="edit-operator-form" onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-lg">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#202A24] mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202A24] mb-1">Primary Phone</label>
            <input
              type="tel"
              value={phoneE164}
              onChange={(e) => setPhoneE164(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm font-mono border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202A24] mb-1">Secondary Phone</label>
            <input
              type="tel"
              value={secondaryPhoneE164}
              onChange={(e) => setSecondaryPhoneE164(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm font-mono border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202A24] mb-1">Vehicle Plate</label>
            <input
              type="text"
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm font-mono uppercase border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202A24] mb-1">Vehicle Type</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            >
              {VEHICLE_TYPES.map((vt) => (
                <option key={vt} value={vt}>
                  {vt}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202A24] mb-1">
              Tank Capacity (Litres)
            </label>
            <input
              type="number"
              min={2000}
              max={40000}
              step={500}
              value={tankCapacityLitres}
              onChange={(e) => setTankCapacityLitres(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm font-mono border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202A24] mb-1">Availability</label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as OperatorStatus)}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            >
              {AVAILABILITY_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202A24] mb-1">Subcity</label>
            <select
              value={subcityId}
              onChange={(e) => handleSubcityChange(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            >
              {subcities.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.nameEn}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202A24] mb-1">Neighbourhood</label>
            <select
              value={neighbourhoodId}
              onChange={(e) => setNeighbourhoodId(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            >
              {availableNeighbourhoods.map((nb) => (
                <option key={nb.id} value={nb.id}>
                  {nb.nameEn}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#202A24] mb-1">Vehicle Photo</label>
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium text-[#202A24] bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg cursor-pointer hover:bg-[#DCE8DF]/50 w-full sm:w-auto">
                <Upload className="w-3.5 h-3.5" />
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileChange}
                  className="sr-only"
                />
              </label>
              <button
                type="button"
                onClick={() => setVehiclePhotoUrl(TRUCK_MEDIUM_IMAGE)}
                className="min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium text-[#123C2A] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0] flex-1 sm:flex-none"
              >
                Medium Tanker
              </button>
              <button
                type="button"
                onClick={() => setVehiclePhotoUrl(TRUCK_HEAVY_IMAGE)}
                className="min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium text-[#123C2A] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0] flex-1 sm:flex-none"
              >
                Heavy Vacuum
              </button>
              {vehiclePhotoUrl && (
                <>
                  <img
                    src={vehiclePhotoUrl}
                    alt="Vehicle preview"
                    className="w-14 h-10 object-cover rounded-md border border-[#E6EAE5]"
                  />
                  <button
                    type="button"
                    onClick={() => setVehiclePhotoUrl('')}
                    className="min-h-[40px] sm:min-h-0 px-2 text-xs text-[#991B1B] hover:underline"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#202A24] mb-1">Vehicle Notes</label>
            <input
              type="text"
              value={vehicleNotes}
              onChange={(e) => setVehicleNotes(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#202A24] mb-1">Internal Notes</label>
            <textarea
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
