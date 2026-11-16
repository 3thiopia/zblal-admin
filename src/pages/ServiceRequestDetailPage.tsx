import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  Truck,
  Check,
  Play,
  XCircle,
  Loader2,
  Search,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { RequestStatusControl } from '../components/requests/RequestStatusControl';
import {
  formatDateTime,
  formatETB,
  formatLitres,
  isCallablePhone,
  toTelHref,
} from '../utils/formatters';
import {
  getEligiblePrioritizedOperators,
  OperatorLocationPriorityTier,
} from '../utils/operatorSelection';
import { CallOutcome } from '../types';

const PRIORITY_BADGE_STYLES: Record<OperatorLocationPriorityTier, string> = {
  same_neighbourhood: 'bg-[#123C2A] text-white border-[#123C2A]',
  same_subcity: 'bg-[#DCE8DF] text-[#123C2A] border-[#C3D9C9]',
  other_area: 'bg-[#F7F6F0] text-[#5C665F] border-[#E6EAE5]',
};

const CALL_OUTCOMES: CallOutcome[] = [
  'Answered - Accepted',
  'Answered - Declined',
  'No Answer',
  'Line Busy',
  'Requested Callback',
];

export function ServiceRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    requests,
    operators,
    assignments,
    subcities,
    updatingRequestIds,
    selectOperatorForRequest,
    recordOperatorCallOutcome,
    confirmRequestAssignment,
    cancelRequestAssignment,
    updateRequestStatus,
  } = useApp();

  const request = requests.find((r) => r.id === id);

  const [subcityFilter, setSubcityFilter] = useState<string>('all');
  const [operatorSearch, setOperatorSearch] = useState('');
  const [callOutcome, setCallOutcome] = useState<CallOutcome>('Answered - Accepted');
  const [callNotes, setCallNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmAssignOpen, setConfirmAssignOpen] = useState(false);
  const [cancelAssignOpen, setCancelAssignOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  useEffect(() => {
    setSubcityFilter('all');
    setOperatorSearch('');
  }, [id]);

  const {
    filtered: availableOperators,
    counts: operatorPriorityCounts,
  } = useMemo(() => {
    if (!request) {
      return {
        allEligible: [],
        filtered: [],
        counts: { sameNeighbourhood: 0, sameSubcity: 0, otherArea: 0, total: 0 },
      };
    }
    return getEligiblePrioritizedOperators({
      request,
      operators,
      requests,
      assignments,
      subcityFilter,
      searchQuery: operatorSearch,
    });
  }, [request, operators, requests, assignments, subcityFilter, operatorSearch]);

  if (!request) {
    return (
      <EmptyState
        title="Service request not found"
        description="The requested service record could not be located."
        action={
          <Link
            to="/requests"
            className="px-4 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg"
          >
            Back to Service Requests
          </Link>
        }
      />
    );
  }

  const workflow = request.assignmentWorkflow;
  const selectedOperator = operators.find(
    (o) => o.id === (request.assignedOperatorId || workflow?.selectedOperatorId)
  );
  const assignedOperator = operators.find((o) => o.id === request.assignedOperatorId);

  const step1Done = Boolean(workflow?.selectedOperatorId || request.assignedOperatorId);
  const step2Done = Boolean(workflow?.contactedAt || request.assignedOperatorId);
  const step3Done = Boolean(
    request.assignedOperatorId &&
      (request.status === 'Assigned' ||
        request.status === 'In Progress' ||
        request.status === 'Completed')
  );

  const canAssign =
    request.status === 'Pending' ||
    request.status === 'Operator Selected' ||
    request.status === 'Operator Contacted';

  const isUpdatingStatus = Boolean(updatingRequestIds[request.id]);
  const isBusy = busy || isUpdatingStatus;
  const hasCustomerPhone = isCallablePhone(request.customerPhone);

  const runAction = async (fn: () => Promise<unknown>) => {
    if (isBusy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1 min-w-0">
          <Link
            to="/requests"
            className="inline-flex items-center gap-1.5 py-1 text-xs font-medium text-[#758078] hover:text-[#123C2A]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Service Requests
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg sm:text-xl font-semibold font-mono text-[#202A24] break-all">
              {request.referenceNumber}
            </h2>
            <StatusBadge status={request.status} />
            <StatusBadge status={request.priority} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
          {request.status === 'Assigned' && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void runAction(() => updateRequestStatus(request.id, 'In Progress'))}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-3.5 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] disabled:opacity-50"
            >
              {isUpdatingStatus ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              Mark In Progress
            </button>
          )}
          {(request.status === 'Assigned' || request.status === 'In Progress') && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void runAction(() => updateRequestStatus(request.id, 'Completed'))}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-3.5 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] disabled:opacity-50"
            >
              {isUpdatingStatus ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Mark Completed
            </button>
          )}
          {request.status !== 'Completed' && request.status !== 'Cancelled' && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setCancelDialogOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-3.5 py-2 text-xs font-medium text-[#991B1B] bg-[#FEE2E2] border border-[#FECACA] rounded-lg hover:bg-[#FECACA]/70 disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel Request
            </button>
          )}
        </div>
      </div>

      {/* Main 2-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 sm:gap-6">
        {/* Left: Customer, Location, Pricing & Status History */}
        <div className="space-y-5 sm:space-y-6 min-w-0">
          <section className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#202A24]">Request Summary</h3>
              <StatusBadge status={request.status} />
            </div>

            {/* Prominent Customer Identity & Always-Visible Phone + Call CTA */}
            <div className="p-3.5 bg-[#DCE8DF]/35 border border-[#C3D9C9] rounded-xl space-y-2.5 min-w-0">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider">
                  Customer
                </p>
                {request.customerId ? (
                  <Link
                    to={`/customers/${request.customerId}`}
                    className="text-sm font-semibold text-[#202A24] hover:text-[#123C2A] hover:underline block mt-0.5 break-words"
                  >
                    {request.customerName}
                  </Link>
                ) : (
                  <p className="text-sm font-semibold text-[#202A24] mt-0.5 break-words">
                    {request.customerName}
                  </p>
                )}
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-mono font-semibold text-[#123C2A] break-all">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>{hasCustomerPhone ? request.customerPhone : 'No phone on file'}</span>
                </p>
              </div>

              {hasCustomerPhone && (
                <a
                  href={toTelHref(request.customerPhone)}
                  aria-label={`Call ${request.customerName} at ${request.customerPhone}`}
                  className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 text-xs font-semibold text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] active:scale-[0.98] transition-all"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>Call Customer ({request.customerPhone})</span>
                </a>
              )}
            </div>

            {/* Direct Status Update Control */}
            <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg space-y-1.5">
              <p className="text-[11px] font-semibold text-[#758078] uppercase tracking-wider">
                Update Request Status
              </p>
              <RequestStatusControl request={request} variant="detail" />
            </div>

            <dl className="space-y-3 text-xs">
              <div className="flex justify-between gap-3 py-1.5 border-b border-[#E6EAE5]">
                <dt className="text-[#758078] shrink-0">Service Location</dt>
                <dd className="text-[#202A24] text-right min-w-0 break-words">
                  {request.subcityName} · {request.neighbourhoodName}
                </dd>
              </div>
              <div className="py-1.5 border-b border-[#E6EAE5]">
                <dt className="text-[#758078] mb-1">Landmark / Access</dt>
                <dd className="text-[#202A24] flex items-start gap-1.5 break-words">
                  <MapPin className="w-3.5 h-3.5 text-[#123C2A] mt-0.5 shrink-0" />
                  <span className="min-w-0">{request.streetLandmark}</span>
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-1.5 border-b border-[#E6EAE5]">
                <dt className="text-[#758078] shrink-0">Est. Volume</dt>
                <dd className="font-mono tabular-nums text-[#202A24]">
                  {formatLitres(request.estimatedVolumeLitres)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-1.5 border-b border-[#E6EAE5]">
                <dt className="text-[#758078] shrink-0">Priority Price</dt>
                <dd className="font-mono tabular-nums font-semibold text-[#123C2A]">
                  {formatETB(request.priceEtb)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 py-1.5">
                <dt className="text-[#758078] shrink-0">Submitted</dt>
                <dd className="font-mono text-[#202A24] text-right">
                  {formatDateTime(request.submittedAt)}
                </dd>
              </div>
            </dl>

            {request.customerNotes && (
              <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg text-xs">
                <p className="font-semibold text-[#202A24] mb-1">Customer Notes</p>
                <p className="text-[#758078] leading-relaxed break-words">{request.customerNotes}</p>
              </div>
            )}
          </section>

          {/* Status History */}
          <section className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-[#202A24] mb-4">Status History</h3>
            <ol className="space-y-4">
              {request.statusHistory.map((item) => (
                <li key={item.id} className="flex items-start gap-3 text-xs">
                  <div className="w-6 h-6 rounded-full bg-[#DCE8DF] text-[#123C2A] flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-3 h-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-[#202A24]">{item.status}</span>
                      <span className="font-mono text-[11px] text-[#758078]">
                        {formatDateTime(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-[#758078] mt-0.5">By {item.actor}</p>
                    {item.note && <p className="text-[#202A24] mt-1 break-words">{item.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Right 2 columns: Operator Assignment Workflow */}
        <div className="xl:col-span-2 space-y-5 sm:space-y-6 min-w-0">
          {/* 3-Step Visual Progression */}
          <section className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-[#202A24] mb-1">
              Operator Assignment Workflow
            </h3>
            <p className="text-xs text-[#758078] mb-4">
              Select an available operator, place a phone call to verify readiness, record the outcome in service_assignments, and confirm the assignment.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  step: '1. Operator Selected',
                  done: step1Done,
                  active: !step1Done && canAssign,
                  detail: selectedOperator ? selectedOperator.fullName : 'Select from list below',
                },
                {
                  step: '2. Operator Contacted',
                  done: step2Done,
                  active: step1Done && !step2Done && canAssign,
                  detail: workflow?.callOutcome
                    ? workflow.callOutcome
                    : 'Call & log outcome manually',
                },
                {
                  step: '3. Assignment Confirmed',
                  done: step3Done,
                  active: step2Done && !step3Done && canAssign,
                  detail: assignedOperator
                    ? `Confirmed to ${assignedOperator.fullName}`
                    : 'Awaiting final confirmation',
                },
              ].map((s) => (
                <div
                  key={s.step}
                  className={`p-3.5 rounded-lg border text-xs ${
                    s.done
                      ? 'bg-[#DCE8DF]/55 border-[#C3D9C9]'
                      : s.active
                      ? 'bg-[#F7F6F0] border-[#123C2A]'
                      : 'bg-white border-[#E6EAE5]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#202A24]">{s.step}</span>
                    {s.done && <Check className="w-4 h-4 text-[#123C2A]" />}
                  </div>
                  <p className="text-[#758078] mt-1 truncate">{s.detail}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Selected / Assigned Operator Call & Confirmation Panel */}
          {selectedOperator && (
            <section className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6EAE5]">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#DCE8DF] text-[#123C2A] flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-[#202A24]">
                        {selectedOperator.fullName}
                      </h4>
                      <StatusBadge status={selectedOperator.availability} />
                    </div>
                    <p className="text-xs text-[#758078] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-mono text-[#202A24]">{selectedOperator.primaryPhone}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{selectedOperator.vehiclePlate || 'No plate'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedOperator.vehicleType}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatLitres(selectedOperator.tankCapacityLitres)}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {selectedOperator.subcityName} ({selectedOperator.neighbourhoodName})
                      </span>
                    </p>
                  </div>
                </div>

                {/* Visible Call Operator tel: link */}
                <a
                  href={toTelHref(selectedOperator.primaryPhone)}
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] px-4 py-2.5 text-xs font-semibold text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] transition-colors whitespace-nowrap shrink-0 w-full sm:w-auto"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call Operator ({selectedOperator.primaryPhone})
                </a>
              </div>

              {canAssign ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Step 2: Record Call Outcome */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-semibold text-[#202A24]">
                      Record Phone Call Outcome
                    </h5>
                    <p className="text-[11px] text-[#758078]">
                      Calling opens your device dialer. Explicitly record what the operator answered below.
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-[#202A24] mb-1">
                        Call Outcome
                      </label>
                      <select
                        value={callOutcome}
                        onChange={(e) => setCallOutcome(e.target.value as CallOutcome)}
                        className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
                      >
                        {CALL_OUTCOMES.map((co) => (
                          <option key={co} value={co}>
                            {co}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#202A24] mb-1">
                        Call Notes (ETA, road access, etc.)
                      </label>
                      <input
                        type="text"
                        value={callNotes}
                        onChange={(e) => setCallNotes(e.target.value)}
                        placeholder="e.g. Confirmed ETA 45 minutes from Gerji..."
                        className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        void runAction(() =>
                          recordOperatorCallOutcome(request.id, callOutcome, callNotes)
                        )
                      }
                      className="w-full sm:w-auto min-h-[44px] sm:min-h-[36px] px-4 py-2 text-xs font-medium text-[#123C2A] bg-[#DCE8DF] border border-[#C3D9C9] rounded-lg hover:bg-[#C3D9C9]/70 transition-colors disabled:opacity-50"
                    >
                      Save Call Outcome
                    </button>
                  </div>

                  {/* Step 3: Confirm or Cancel Assignment */}
                  <div className="flex flex-col justify-between p-4 bg-[#F7F6F0] border border-[#E6EAE5] rounded-xl space-y-3">
                    <div>
                      <h5 className="text-xs font-semibold text-[#202A24]">
                        Confirm or Cancel Selection
                      </h5>
                      <p className="text-xs text-[#758078] mt-1 leading-relaxed">
                        {workflow?.contactedAt
                          ? `Last call logged (${formatDateTime(workflow.contactedAt)}): ${workflow.callOutcome}.`
                          : 'Call the operator and record the call outcome before confirming assignment.'}
                      </p>
                      {workflow?.contactedAt && workflow.callOutcome !== 'Answered - Accepted' && (
                        <p className="text-xs text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] rounded-lg px-2.5 py-2 mt-2">
                          Confirmation requires “Answered - Accepted”. Call again, choose another operator, or cancel this selection.
                        </p>
                      )}
                      {workflow?.callNotes && (
                        <p className="text-xs text-[#202A24] mt-2 italic">“{workflow.callNotes}”</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled={isBusy || workflow?.callOutcome !== 'Answered - Accepted'}
                        onClick={() => setConfirmAssignOpen(true)}
                        className="w-full min-h-[44px] sm:min-h-[38px] px-4 py-2.5 text-xs font-semibold text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Confirm Assignment to {selectedOperator.fullName}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setCancelAssignOpen(true)}
                        className="w-full min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs font-medium text-[#991B1B] bg-white border border-[#FECACA] rounded-lg hover:bg-[#FEE2E2]/50 transition-colors disabled:opacity-50"
                      >
                        Cancel Operator Selection
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-[#DCE8DF]/40 border border-[#C3D9C9] rounded-lg text-xs text-[#123C2A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold">Assignment Active:</span>{' '}
                    Assigned to {selectedOperator.fullName}
                    {workflow?.confirmedBy ? ` by ${workflow.confirmedBy}` : ''}.
                  </div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {request.status === 'Assigned' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setCancelAssignOpen(true)}
                        className="min-h-[40px] sm:min-h-0 px-3 py-1.5 sm:px-2.5 sm:py-1 text-xs font-medium text-[#991B1B] bg-white border border-[#FECACA] rounded-md hover:bg-[#FEE2E2]/60 disabled:opacity-50"
                      >
                        Cancel Assignment
                      </button>
                    )}
                    <Link
                      to={`/operators/${selectedOperator.id}`}
                      className="font-medium underline whitespace-nowrap py-1"
                    >
                      View Operator
                    </Link>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Available Operators Selector */}
          {canAssign && (
            <section className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5 space-y-4">
              <div className="space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-[#202A24]">
                      Available Operators ({availableOperators.length}
                      {availableOperators.length !== operatorPriorityCounts.total
                        ? ` of ${operatorPriorityCounts.total}`
                        : ''}
                      )
                    </h4>
                    <p className="text-xs text-[#758078] mt-0.5">
                      Showing all eligible Addis Ababa operators prioritized by Same Neighbourhood, then Same Subcity, then Other Area.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2">
                    <select
                      value={subcityFilter}
                      onChange={(e) => setSubcityFilter(e.target.value)}
                      aria-label="Filter operators by subcity"
                      className="w-full sm:w-auto min-h-[44px] sm:min-h-[36px] px-3 py-1.5 text-xs bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
                    >
                      <option value="all">
                        All subcities ({operatorPriorityCounts.total})
                      </option>
                      {subcities.map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.nameEn}
                          {sc.id === request.subcityId ? ' (Customer Subcity)' : ''}
                        </option>
                      ))}
                    </select>

                    <div className="relative w-full sm:w-56">
                      <Search className="w-3.5 h-3.5 text-[#758078] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="search"
                        value={operatorSearch}
                        onChange={(e) => setOperatorSearch(e.target.value)}
                        placeholder="Search name, phone, or plate..."
                        aria-label="Search operators by name, phone number, or vehicle plate"
                        className="w-full min-h-[44px] sm:min-h-[36px] pl-8 pr-3 py-1.5 text-xs bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg focus:outline-none focus:bg-white focus:border-[#123C2A]"
                      />
                    </div>
                  </div>
                </div>

                {/* Priority group counts summary */}
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-[#123C2A] text-white border-[#123C2A] font-medium">
                    <span>Same Neighbourhood</span>
                    <span className="font-mono opacity-90">
                      {operatorPriorityCounts.sameNeighbourhood}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-[#DCE8DF] text-[#123C2A] border-[#C3D9C9] font-medium">
                    <span>Same Subcity</span>
                    <span className="font-mono">{operatorPriorityCounts.sameSubcity}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-[#F7F6F0] text-[#5C665F] border-[#E6EAE5] font-medium">
                    <span>Other Area</span>
                    <span className="font-mono">{operatorPriorityCounts.otherArea}</span>
                  </span>
                </div>
              </div>

              {availableOperators.length === 0 ? (
                <div className="p-6 text-center bg-[#F7F6F0]/60 border border-[#E6EAE5] rounded-lg space-y-2">
                  <p className="text-xs font-medium text-[#202A24]">
                    {operatorPriorityCounts.total === 0
                      ? 'No eligible available operators with active vehicles are currently free across Addis Ababa.'
                      : 'No eligible available operators match your current subcity or search filter.'}
                  </p>
                  {(subcityFilter !== 'all' || operatorSearch.trim() !== '') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSubcityFilter('all');
                        setOperatorSearch('');
                      }}
                      className="py-2 px-3 text-xs font-medium text-[#123C2A] hover:underline"
                    >
                      Show all eligible Addis Ababa operators ({operatorPriorityCounts.total})
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {availableOperators.map(({ operator: op, priorityTier, priorityLabel }) => {
                    const isSelected = workflow?.selectedOperatorId === op.id;
                    const callable = isCallablePhone(op.primaryPhone);
                    return (
                      <div
                        key={op.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between gap-3.5 transition-colors min-w-0 ${
                          isSelected
                            ? 'bg-[#DCE8DF]/40 border-[#123C2A] shadow-sm'
                            : 'bg-white border-[#E6EAE5] hover:bg-[#F7F6F0]/50'
                        }`}
                      >
                        {/* Top badges: Location Priority + Availability Status */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-md border whitespace-nowrap ${PRIORITY_BADGE_STYLES[priorityTier]}`}
                          >
                            {priorityLabel}
                          </span>
                          <StatusBadge status={op.availability} />
                        </div>

                        {/* Operator Identity & Phone */}
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-semibold text-[#202A24] break-words">
                            {op.fullName}
                          </p>
                          <p className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-[#123C2A] break-all">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span>{callable ? op.primaryPhone : 'No phone on file'}</span>
                          </p>
                        </div>

                        {/* Location & Vehicle Details */}
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 p-2.5 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg text-xs">
                          <div className="min-w-0">
                            <dt className="text-[10px] text-[#758078] uppercase tracking-wider">
                              Subcity
                            </dt>
                            <dd className="font-medium text-[#202A24] truncate mt-0.5">
                              {op.subcityName}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[10px] text-[#758078] uppercase tracking-wider">
                              Neighbourhood
                            </dt>
                            <dd className="font-medium text-[#202A24] truncate mt-0.5">
                              {op.neighbourhoodName}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[10px] text-[#758078] uppercase tracking-wider">
                              Vehicle Type
                            </dt>
                            <dd className="font-medium text-[#202A24] truncate mt-0.5">
                              {op.vehicleType}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[10px] text-[#758078] uppercase tracking-wider">
                              Plate &amp; Capacity
                            </dt>
                            <dd className="font-mono font-medium text-[#202A24] truncate mt-0.5">
                              {op.vehiclePlate || 'No plate'} · {formatLitres(op.tankCapacityLitres)}
                            </dd>
                          </div>
                        </dl>

                        {/* Actions: Call (tel:) + Select Operator */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                          {callable && (
                            <a
                              href={toTelHref(op.primaryPhone)}
                              aria-label={`Call ${op.fullName} at ${op.primaryPhone}`}
                              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-3 py-2 text-xs font-semibold text-[#123C2A] bg-white border border-[#123C2A]/30 rounded-lg hover:bg-[#DCE8DF]/50 transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5 shrink-0" />
                              <span>Call Operator</span>
                            </a>
                          )}

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void runAction(() => selectOperatorForRequest(request.id, op.id))}
                            className={`${
                              callable ? '' : 'sm:col-span-2'
                            } inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] py-2 px-3 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                              isSelected
                                ? 'bg-[#DCE8DF] text-[#123C2A] border border-[#123C2A]'
                                : 'bg-[#123C2A] text-white hover:bg-[#0E2F21]'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                            <span>{isSelected ? 'Selected Operator' : 'Select Operator'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmAssignOpen}
        onClose={() => setConfirmAssignOpen(false)}
        onConfirm={() => void runAction(() => confirmRequestAssignment(request.id))}
        title="Confirm operator assignment?"
        description={`Assign ${request.referenceNumber} (${request.subcityName} · ${request.neighbourhoodName}) to ${
          selectedOperator?.fullName ?? 'this operator'
        }? Their status will be updated to Assigned.`}
        confirmLabel="Confirm Assignment"
      />

      <ConfirmDialog
        open={cancelAssignOpen}
        onClose={() => setCancelAssignOpen(false)}
        onConfirm={() => void runAction(() => cancelRequestAssignment(request.id))}
        tone="danger"
        title={`Cancel operator assignment for ${request.referenceNumber}?`}
        description="This releases the selected/assigned operator back to Available and returns the service request to Pending status for reassignment."
        confirmLabel="Cancel Assignment"
      />

      <ConfirmDialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={() => void runAction(() => updateRequestStatus(request.id, 'Cancelled'))}
        tone="danger"
        title={`Cancel request ${request.referenceNumber}?`}
        description="Cancelling will stop dispatch for this request and release any assigned operator back to Available."
        confirmLabel="Cancel Request"
      />
    </div>
  );
}
