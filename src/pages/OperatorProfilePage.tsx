import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Edit3,
  ShieldAlert,
  ShieldCheck,
  Truck,
  MapPin,
  Calendar,
  Trash2,
  ClipboardList,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EditOperatorModal } from '../components/operators/EditOperatorModal';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate, formatETB, formatLitres, isCallablePhone, toTelHref } from '../utils/formatters';
import { OperatorStatus } from '../types';

type ProfileTab = 'assignments' | 'completed' | 'notes';

const AVAILABILITY_OPTIONS: OperatorStatus[] = [
  'Available',
  'Assigned',
  'Busy',
  'Unavailable',
];

export function OperatorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    operators,
    requests,
    assignments,
    changeOperatorAvailability,
    updateOperator,
    deleteOperator,
  } = useApp();

  const operator = operators.find((o) => o.id === id);

  const [activeTab, setActiveTab] = useState<ProfileTab>('assignments');
  const [editOpen, setEditOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState(operator?.internalNotes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const tabsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotesDraft(operator?.internalNotes ?? '');
  }, [operator?.id, operator?.internalNotes]);

  const operatorRequests = useMemo(() => {
    if (!operator) return [];
    const reqIdsFromAssignments = new Set(
      assignments.filter((a) => a.operatorId === operator.id).map((a) => a.serviceRequestId)
    );
    return requests.filter(
      (r) => r.assignedOperatorId === operator.id || reqIdsFromAssignments.has(r.id)
    );
  }, [requests, assignments, operator]);

  const completedRequests = useMemo(
    () => operatorRequests.filter((r) => r.status === 'Completed'),
    [operatorRequests]
  );

  if (!operator) {
    return (
      <EmptyState
        title="Operator not found"
        description="This operator record does not exist in Supabase or has been removed."
        action={
          <Link
            to="/operators"
            className="px-4 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg"
          >
            Back to Operators
          </Link>
        }
      />
    );
  }

  const isSuspended = operator.availability === 'Suspended';

  const handleToggleSuspend = async () => {
    if (isSuspended) {
      await changeOperatorAvailability(operator.id, 'Available', 'Reactivated by operations staff.');
    } else {
      await changeOperatorAvailability(operator.id, 'Suspended', 'Suspended by operations staff.');
    }
  };

  const handleDeleteConfirm = async () => {
    await deleteOperator(operator.id);
    navigate('/operators');
  };

  return (
    <div className="space-y-5 sm:space-y-6 min-w-0">
      {/* Top breadcrumb back + action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <Link
          to="/operators"
          className="inline-flex items-center gap-1.5 py-1 text-xs font-medium text-[#758078] hover:text-[#123C2A]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Vehicle Operators
        </Link>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5">
          {isCallablePhone(operator.phone_e164) && (
            <a
              href={toTelHref(operator.phone_e164)}
              aria-label={`Call ${operator.fullName} at ${operator.phone_e164}`}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-semibold text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] transition-colors"
            >
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Call Operator</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              setActiveTab('assignments');
              tabsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium text-[#202A24] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0] transition-colors"
          >
            <ClipboardList className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Assigned Jobs</span>
          </button>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium text-[#202A24] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0] transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Edit Operator</span>
          </button>
          <button
            type="button"
            onClick={() => setSuspendDialogOpen(true)}
            className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              isSuspended
                ? 'bg-[#123C2A] text-white hover:bg-[#0E2F21]'
                : 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] hover:bg-[#FECACA]/70'
            }`}
          >
            {isSuspended ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Reactivate</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Suspend</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setDeleteDialogOpen(true)}
            aria-label="Remove operator"
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium text-[#991B1B] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#FEE2E2]/50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            Remove
          </button>
        </div>
      </div>

      {/* Overview Header Card */}
      <div className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        <div className="lg:col-span-2 space-y-5 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-semibold text-[#202A24]">{operator.fullName}</h2>
                <StatusBadge status={operator.availability} />
              </div>
              <p className="text-xs text-[#758078] mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  Registered {formatDate(operator.registeredAt)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {operator.subcityName} · {operator.neighbourhoodName}
                </span>
              </p>
            </div>

            {!isSuspended && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label htmlFor="op-availability" className="text-xs font-medium text-[#758078] shrink-0">
                  Availability:
                </label>
                <select
                  id="op-availability"
                  value={operator.availability}
                  onChange={(e) =>
                    void changeOperatorAvailability(operator.id, e.target.value as OperatorStatus)
                  }
                  className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[34px] px-3 py-1.5 text-xs font-medium bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
                >
                  {AVAILABILITY_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#E6EAE5] text-xs">
            <div>
              <dt className="text-[#758078]">Primary Phone</dt>
              <dd className="font-mono font-semibold text-[#123C2A] mt-1 break-all">
                {isCallablePhone(operator.phone_e164) ? (
                  <a href={toTelHref(operator.phone_e164)} className="hover:underline">
                    {operator.phone_e164}
                  </a>
                ) : (
                  <span className="text-[#758078] font-normal">No phone on file</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[#758078]">Secondary Phone</dt>
              <dd className="font-mono text-[#202A24] mt-1 break-all">
                {operator.secondary_phone_e164 && isCallablePhone(operator.secondary_phone_e164) ? (
                  <a href={toTelHref(operator.secondary_phone_e164)} className="text-[#123C2A] hover:underline">
                    {operator.secondary_phone_e164}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[#758078]">Vehicle Plate</dt>
              <dd className="font-mono font-semibold text-[#202A24] mt-1">
                {operator.vehiclePlate || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[#758078]">Tank Capacity</dt>
              <dd className="font-mono font-semibold tabular-nums text-[#202A24] mt-1">
                {formatLitres(operator.tankCapacityLitres)}
              </dd>
            </div>
            <div>
              <dt className="text-[#758078]">Vehicle Type</dt>
              <dd className="text-[#202A24] mt-1">{operator.vehicleType}</dd>
            </div>
            <div>
              <dt className="text-[#758078]">Completed Jobs</dt>
              <dd className="font-mono font-semibold tabular-nums text-[#202A24] mt-1">
                {operator.completedJobsCount}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[#758078]">Completed Order Value</dt>
              <dd className="font-mono font-semibold tabular-nums text-[#123C2A] mt-1">
                {formatETB(operator.totalEarningsEtb)}
              </dd>
            </div>
          </dl>

          {operator.vehicleNotes && (
            <div className="pt-3 border-t border-[#E6EAE5] text-xs">
              <span className="font-medium text-[#758078]">Vehicle Notes: </span>
              <span className="text-[#202A24] break-words">{operator.vehicleNotes}</span>
            </div>
          )}
        </div>

        {/* Vehicle Photo */}
        <div className="aspect-[4/3] lg:aspect-auto rounded-lg overflow-hidden border border-[#E6EAE5] bg-[#F7F6F0]">
          {operator.vehiclePhotoUrl ? (
            <img
              src={operator.vehiclePhotoUrl}
              alt={`${operator.fullName} truck`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#758078] p-6">
              <Truck className="w-8 h-8 mb-2" />
              <span className="text-xs">No vehicle photo uploaded</span>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Tabs */}
      <div ref={tabsSectionRef} className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden">
        <div className="px-3 sm:px-4 pt-2 border-b border-[#E6EAE5] flex items-center gap-1 overflow-x-auto">
          {(
            [
              { id: 'assignments', label: `Assignment History (${operatorRequests.length})` },
              { id: 'completed', label: `Completed Jobs (${completedRequests.length})` },
              { id: 'notes', label: 'Internal Notes' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2.5 min-h-[44px] text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'border-[#123C2A] text-[#123C2A]'
                  : 'border-transparent text-[#758078] hover:text-[#202A24]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          {activeTab === 'assignments' && (
            operatorRequests.length === 0 ? (
              <p className="text-xs text-[#758078] py-4">
                No service requests currently linked to this operator in service_assignments.
              </p>
            ) : (
              <>
                <div className="md:hidden divide-y divide-[#E6EAE5]">
                  {operatorRequests.map((req) => (
                    <div key={req.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            to={`/requests/${req.id}`}
                            className="font-mono text-xs font-semibold text-[#123C2A] hover:underline"
                          >
                            {req.referenceNumber}
                          </Link>
                          <p className="text-xs font-medium text-[#202A24] mt-0.5 truncate">
                            {req.customerName}
                          </p>
                        </div>
                        <StatusBadge status={req.status} />
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-[#758078]">
                        <span className="truncate">
                          {req.subcityName} · {req.neighbourhoodName}
                        </span>
                        <span className="font-mono tabular-nums font-medium text-[#202A24] shrink-0">
                          {formatETB(req.priceEtb)}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-[#758078]">
                        {formatDate(req.submittedAt)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E6EAE5] text-[11px] font-semibold text-[#758078] uppercase">
                        <th className="py-2 pr-4">Reference</th>
                        <th className="py-2 px-4">Customer</th>
                        <th className="py-2 px-4">Location</th>
                        <th className="py-2 px-4">Submitted</th>
                        <th className="py-2 px-4 text-right">Order Value</th>
                        <th className="py-2 pl-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6EAE5] text-xs">
                      {operatorRequests.map((req) => (
                        <tr key={req.id}>
                          <td className="py-3 pr-4 font-mono font-medium text-[#123C2A]">
                            <Link to={`/requests/${req.id}`} className="hover:underline">
                              {req.referenceNumber}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-[#202A24]">{req.customerName}</td>
                          <td className="py-3 px-4 text-[#758078]">
                            {req.subcityName} · {req.neighbourhoodName}
                          </td>
                          <td className="py-3 px-4 font-mono text-[#758078]">
                            {formatDate(req.submittedAt)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-[#202A24]">
                            {formatETB(req.priceEtb)}
                          </td>
                          <td className="py-3 pl-4">
                            <StatusBadge status={req.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )
          )}

          {activeTab === 'completed' && (
            completedRequests.length === 0 ? (
              <p className="text-xs text-[#758078] py-4">
                No completed service requests recorded for this operator yet.
              </p>
            ) : (
              <ul className="divide-y divide-[#E6EAE5]">
                {completedRequests.map((req) => (
                  <li key={req.id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <Link
                        to={`/requests/${req.id}`}
                        className="font-mono font-medium text-[#123C2A] hover:underline"
                      >
                        {req.referenceNumber}
                      </Link>
                      <span className="text-[#758078] ml-2">
                        {req.customerName} · {req.subcityName} ({req.neighbourhoodName})
                      </span>
                    </div>
                    <span className="font-mono tabular-nums font-medium text-[#202A24]">
                      {formatETB(req.priceEtb)}
                    </span>
                  </li>
                ))}
              </ul>
            )
          )}

          {activeTab === 'notes' && (
            <div className="space-y-3 max-w-2xl">
              <label className="block text-xs font-medium text-[#202A24]">
                Internal Staff Notes
              </label>
              <textarea
                rows={4}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Add dispatch preferences, permit status, or operational observations..."
                className="w-full px-3 py-2 text-sm border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
              />
              <button
                type="button"
                disabled={savingNotes}
                onClick={async () => {
                  setSavingNotes(true);
                  try {
                    await updateOperator(operator.id, { internalNotes: notesDraft });
                  } finally {
                    setSavingNotes(false);
                  }
                }}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] disabled:opacity-50"
              >
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          )}
        </div>
      </div>

      <EditOperatorModal
        operator={operator}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />

      <ConfirmDialog
        open={suspendDialogOpen}
        onClose={() => setSuspendDialogOpen(false)}
        onConfirm={() => void handleToggleSuspend()}
        tone={isSuspended ? 'primary' : 'danger'}
        title={isSuspended ? `Reactivate ${operator.fullName}?` : `Suspend ${operator.fullName}?`}
        description={
          isSuspended
            ? 'Reactivating this operator will return their availability to Available so dispatchers can assign jobs again.'
            : 'Suspending this operator removes them from available dispatch selections until reactivated by staff.'
        }
        confirmLabel={isSuspended ? 'Reactivate Operator' : 'Suspend Operator'}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => void handleDeleteConfirm()}
        tone="danger"
        title={`Remove ${operator.fullName} from Supabase?`}
        description="This deletes the operator record and linked vehicle from Supabase."
        confirmLabel="Remove Operator"
      />
    </div>
  );
}
