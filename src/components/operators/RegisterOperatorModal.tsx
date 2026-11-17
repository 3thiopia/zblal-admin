import React, { useEffect, useMemo, useState } from 'react';
import { Upload, CheckCircle2, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useApp } from '../../context/AppContext';
import { OperatorStatus, VehicleType } from '../../types';
import { TRUCK_HEAVY_IMAGE, TRUCK_MEDIUM_IMAGE } from '../../lib/assets';

interface RegisterOperatorModalProps {
  open: boolean;
  onClose: () => void;
}

const VEHICLE_TYPES: VehicleType[] = [
  'Light Vacuum Truck',
  'Medium Tanker',
  'Heavy Vacuum Tanker',
  'Industrial Septic Truck',
];

const INITIAL_STATUS_OPTIONS: OperatorStatus[] = ['Available', 'Unavailable'];

export function RegisterOperatorModal({ open, onClose }: RegisterOperatorModalProps) {
  const { subcities, neighbourhoods, addOperator } = useApp();

  const activeSubcities = useMemo(() => subcities.filter((s) => s.active), [subcities]);

  const [fullName, setFullName] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Medium Tanker');
  const [tankCapacityLitres, setTankCapacityLitres] = useState('10000');
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState('');
  const [vehicleNotes, setVehicleNotes] = useState('');
  const [subcityId, setSubcityId] = useState('');
  const [neighbourhoodId, setNeighbourhoodId] = useState('');
  const [availability, setAvailability] = useState<OperatorStatus>('Available');
  const [internalNotes, setInternalNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const availableNeighbourhoods = useMemo(() => {
    if (!subcityId) return [];
    return neighbourhoods.filter((n) => n.subcityId === subcityId && n.active);
  }, [subcityId, neighbourhoods]);

  useEffect(() => {
    if (open) {
      setSubmittedSuccess(false);
      setErrors({});
      setSubmitError(null);
      if (!subcityId && activeSubcities.length > 0) {
        const firstSub = activeSubcities[0].id;
        setSubcityId(firstSub);
        const firstNb = neighbourhoods.find((n) => n.subcityId === firstSub && n.active);
        setNeighbourhoodId(firstNb?.id ?? '');
      }
    }
  }, [open, activeSubcities, neighbourhoods, subcityId]);

  const handleSubcityChange = (newSubId: string) => {
    setSubcityId(newSubId);
    const matching = neighbourhoods.filter((n) => n.subcityId === newSubId && n.active);
    setNeighbourhoodId(matching[0]?.id ?? '');
    setErrors((prev) => ({ ...prev, subcityId: '', neighbourhoodId: '' }));
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

  const resetForm = () => {
    setFullName('');
    setPrimaryPhone('');
    setSecondaryPhone('');
    setVehiclePlate('');
    setVehicleType('Medium Tanker');
    setTankCapacityLitres('10000');
    setVehiclePhotoUrl('');
    setVehicleNotes('');
    const firstSub = activeSubcities[0]?.id ?? '';
    setSubcityId(firstSub);
    const firstNb = neighbourhoods.find((n) => n.subcityId === firstSub && n.active);
    setNeighbourhoodId(firstNb?.id ?? '');
    setAvailability('Available');
    setInternalNotes('');
    setErrors({});
    setSubmitError(null);
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (fullName.trim().length < 3) {
      nextErrors.fullName = 'Please enter the operator’s full name (at least 3 characters).';
    }
    const cleanedPhone = primaryPhone.replace(/\s+/g, '');
    if (!/^(\+251|0)9\d{8}$/.test(cleanedPhone)) {
      nextErrors.primaryPhone = 'Enter a valid Ethiopian mobile number (e.g. +251 911 482 910 or 0911482910).';
    }
    if (secondaryPhone.trim()) {
      const cleanedSec = secondaryPhone.replace(/\s+/g, '');
      if (!/^(\+251|0)9\d{8}$/.test(cleanedSec)) {
        nextErrors.secondaryPhone = 'Secondary number must be a valid Ethiopian mobile number.';
      }
    }
    if (vehiclePlate.trim().length < 4) {
      nextErrors.vehiclePlate = 'Enter the registered vehicle plate number (e.g. ET-3-48219 AA).';
    }
    const capacity = Number(tankCapacityLitres);
    if (!Number.isFinite(capacity) || capacity < 2000 || capacity > 40000) {
      nextErrors.tankCapacityLitres = 'Tank capacity must be between 2,000 and 40,000 litres.';
    }
    if (!subcityId) {
      nextErrors.subcityId = 'Select a primary operating subcity.';
    }
    if (!neighbourhoodId) {
      nextErrors.neighbourhoodId = 'Select a primary neighbourhood.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await addOperator({
        fullName: fullName.trim(),
        phone_e164: primaryPhone.trim(),
        secondary_phone_e164: secondaryPhone.trim() || undefined,
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        vehicleType,
        tankCapacityLitres: Number(tankCapacityLitres),
        vehiclePhotoUrl:
          vehiclePhotoUrl ||
          (vehicleType === 'Heavy Vacuum Tanker' || vehicleType === 'Industrial Septic Truck'
            ? TRUCK_HEAVY_IMAGE
            : TRUCK_MEDIUM_IMAGE),
        vehicleNotes: vehicleNotes.trim() || undefined,
        subcityId,
        neighbourhoodId,
        availability,
        internalNotes: internalNotes.trim() || undefined,
      });

      setSubmittedSuccess(true);
      setTimeout(() => {
        resetForm();
        setSubmittedSuccess(false);
        onClose();
      }, 900);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to save operator and vehicle to Supabase.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Register Vehicle Operator"
      subtitle="Staff-managed registration saved to vehicle_operators and operator_vehicles. Operators do not have login accounts."
      size="xl"
      footer={
        <>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#202A24] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="register-operator-form"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] transition-colors disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{submitting ? 'Saving...' : 'Register Operator'}</span>
          </button>
        </>
      }
    >
      {submittedSuccess ? (
        <div className="py-10 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-[#DCE8DF] text-[#123C2A] flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#202A24]">Operator Registered</h3>
          <p className="text-xs text-[#758078] mt-1">
            Saved to Zblal Supabase directory.
          </p>
        </div>
      ) : (
        <form id="register-operator-form" onSubmit={handleSubmit} className="space-y-6" noValidate>
          {submitError && (
            <div className="p-3 text-xs text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-lg">
              {submitError}
            </div>
          )}

          {/* Personal Information */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#202A24] mb-1">
                  Full Name <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Kassahun Mulugeta"
                  className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
                />
                {errors.fullName && <p className="text-xs text-[#B91C1C] mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#202A24] mb-1">
                  Primary Phone Number <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  type="tel"
                  value={primaryPhone}
                  onChange={(e) => setPrimaryPhone(e.target.value)}
                  placeholder="+251 911 482 910"
                  className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm font-mono bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
                />
                {errors.primaryPhone && (
                  <p className="text-xs text-[#B91C1C] mt-1">{errors.primaryPhone}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#202A24] mb-1">
                  Secondary Phone Number (optional)
                </label>
                <input
                  type="tel"
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  placeholder="+251 912 000 000"
                  className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm font-mono bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
                />
                {errors.secondaryPhone && (
                  <p className="text-xs text-[#B91C1C] mt-1">{errors.secondaryPhone}</p>
                )}
              </div>
            </div>
          </section>

          <hr className="border-[#E6EAE5]" />

          {/* Vehicle Information */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
              Vehicle Information (One Truck Per Operator)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#202A24] mb-1">
                  Plate Number <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  type="text"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  placeholder="ET-3-48219 AA"
                  className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm font-mono uppercase bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
                />
                {errors.vehiclePlate && (
                  <p className="text-xs text-[#B91C1C] mt-1">{errors.vehiclePlate}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#202A24] mb-1">
                  Vehicle Type <span className="text-[#B91C1C]">*</span>
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                  className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
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
                  Tank Capacity (Litres) <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  type="number"
                  min={2000}
                  max={40000}
                  step={500}
                  value={tankCapacityLitres}
                  onChange={(e) => setTankCapacityLitres(e.target.value)}
                  className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm font-mono tabular-nums bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
                />
                {errors.tankCapacityLitres && (
                  <p className="text-xs text-[#B91C1C] mt-1">{errors.tankCapacityLitres}</p>
                )}
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-[#202A24] mb-1">
                  Vehicle Photo (optional)
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  <label className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium text-[#202A24] bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg cursor-pointer hover:bg-[#DCE8DF]/50 transition-colors w-full sm:w-auto">
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
                    Use Medium Tanker Sample
                  </button>
                  <button
                    type="button"
                    onClick={() => setVehiclePhotoUrl(TRUCK_HEAVY_IMAGE)}
                    className="min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium text-[#123C2A] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0] flex-1 sm:flex-none"
                  >
                    Use Heavy Vacuum Sample
                  </button>
                  {vehiclePhotoUrl && (
                    <img
                      src={vehiclePhotoUrl}
                      alt="Vehicle preview"
                      className="w-14 h-10 object-cover rounded-md border border-[#E6EAE5]"
                    />
                  )}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-[#202A24] mb-1">
                  Vehicle Notes (optional)
                </label>
                <input
                  type="text"
                  value={vehicleNotes}
                  onChange={(e) => setVehicleNotes(e.target.value)}
                  placeholder="Hose length, pump specs, narrow-street suitability..."
                  className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
                />
              </div>
            </div>
          </section>

          <hr className="border-[#E6EAE5]" />

          {/* Operating Information */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-[#758078] uppercase tracking-wider">
              Operating Area & Initial Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#202A24] mb-1">
                  Subcity <span className="text-[#B91C1C]">*</span>
                </label>
                <select
                  value={subcityId}
                  onChange={(e) => handleSubcityChange(e.target.value)}
                  className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
                >
                  <option value="">Select subcity</option>
                  {activeSubcities.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.nameEn} ({sc.nameAm})
                    </option>
                  ))}
                </select>
                {errors.subcityId && (
                  <p className="text-xs text-[#B91C1C] mt-1">{errors.subcityId}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#202A24] mb-1">
                  Neighbourhood <span className="text-[#B91C1C]">*</span>
                </label>
                <select
                  value={neighbourhoodId}
                  onChange={(e) => setNeighbourhoodId(e.target.value)}
                  disabled={!subcityId || availableNeighbourhoods.length === 0}
                  className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A] disabled:bg-[#F7F6F0]"
                >
                  <option value="">Select neighbourhood</option>
                  {availableNeighbourhoods.map((nb) => (
                    <option key={nb.id} value={nb.id}>
                      {nb.nameEn} ({nb.nameAm})
                    </option>
                  ))}
                </select>
                {errors.neighbourhoodId && (
                  <p className="text-xs text-[#B91C1C] mt-1">{errors.neighbourhoodId}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#202A24] mb-1">
                  Initial Availability
                </label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value as OperatorStatus)}
                  className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
                >
                  {INITIAL_STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-[#202A24] mb-1">
                  Internal Staff Notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Preferred shift hours, dispatch instructions, permit checks..."
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
                />
              </div>
            </div>
          </section>
        </form>
      )}
    </Modal>
  );
}
