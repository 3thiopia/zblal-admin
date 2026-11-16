import { useState } from 'react';
import { Check, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RequestStatus, ServiceRequest } from '../../types';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface StatusOptionMeta {
  value: RequestStatus;
  label: string;
  disabled: boolean;
}

function getStatusOptions(req: ServiceRequest): StatusOptionMeta[] {
  const hasAssignedOperator = Boolean(req.assignedOperatorId);
  const isCompleted = req.status === 'Completed';

  const canMoveToPending =
    !isCompleted &&
    (req.status === 'Pending' ||
      req.status === 'Operator Selected' ||
      req.status === 'Operator Contacted' ||
      req.status === 'Assigned' ||
      req.status === 'Cancelled');

  const canMoveToAssigned =
    !isCompleted &&
    hasAssignedOperator &&
    (req.status === 'Assigned' || req.status === 'In Progress');

  const canMoveToInProgress =
    !isCompleted &&
    hasAssignedOperator &&
    (req.status === 'Assigned' || req.status === 'In Progress');

  const canMoveToCompleted =
    hasAssignedOperator &&
    (req.status === 'Assigned' || req.status === 'In Progress' || req.status === 'Completed');

  const canCancel = !isCompleted;

  return [
    {
      value: 'Pending',
      label: canMoveToPending ? 'Pending' : 'Pending (locked)',
      disabled: !canMoveToPending,
    },
    {
      value: 'Operator Selected',
      label:
        req.status === 'Operator Selected'
          ? 'Operator Selected'
          : 'Operator Selected (via details)',
      disabled: req.status !== 'Operator Selected',
    },
    {
      value: 'Operator Contacted',
      label:
        req.status === 'Operator Contacted'
          ? 'Operator Contacted'
          : 'Operator Contacted (via details)',
      disabled: req.status !== 'Operator Contacted',
    },
    {
      value: 'Assigned',
      label: canMoveToAssigned
        ? 'Assigned'
        : req.status === 'Assigned'
        ? 'Assigned'
        : 'Assigned (confirm operator)',
      disabled: !canMoveToAssigned && req.status !== 'Assigned',
    },
    {
      value: 'In Progress',
      label: canMoveToInProgress
        ? 'In Progress'
        : req.status === 'In Progress'
        ? 'In Progress'
        : 'In Progress (assign operator)',
      disabled: !canMoveToInProgress && req.status !== 'In Progress',
    },
    {
      value: 'Completed',
      label: canMoveToCompleted
        ? 'Completed'
        : req.status === 'Completed'
        ? 'Completed'
        : 'Completed (assign operator)',
      disabled: !canMoveToCompleted && req.status !== 'Completed',
    },
    {
      value: 'Cancelled',
      label: canCancel ? 'Cancelled' : 'Cancelled (locked)',
      disabled: !canCancel && req.status !== 'Cancelled',
    },
  ];
}

interface RequestStatusControlProps {
  request: ServiceRequest;
  variant?: 'compact' | 'card' | 'detail';
}

export function RequestStatusControl({
  request,
  variant = 'compact',
}: RequestStatusControlProps) {
  const { updateRequestStatus, updatingRequestIds } = useApp();
  const [pendingConfirmStatus, setPendingConfirmStatus] = useState<RequestStatus | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const isSaving = Boolean(updatingRequestIds[request.id]);
  const isLocked = request.status === 'Completed';
  const options = getStatusOptions(request);

  const commitChange = async (nextStatus: RequestStatus) => {
    setInlineError(null);
    setJustSaved(false);
    const res = await updateRequestStatus(request.id, nextStatus);
    if (res.ok) {
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 2500);
    } else if (res.error) {
      setInlineError(res.error);
    }
  };

  const handleSelectChange = (nextVal: string) => {
    const nextStatus = nextVal as RequestStatus;
    if (nextStatus === request.status || isSaving || isLocked) return;

    const needsAssignmentCancelConfirm =
      nextStatus === 'Pending' &&
      (request.status === 'Operator Selected' ||
        request.status === 'Operator Contacted' ||
        request.status === 'Assigned');

    if (nextStatus === 'Cancelled' || needsAssignmentCancelConfirm) {
      setPendingConfirmStatus(nextStatus);
      return;
    }

    void commitChange(nextStatus);
  };

  const selectSizeClass =
    variant === 'compact'
      ? 'h-9 sm:h-8 pl-2.5 pr-7 text-xs min-w-[148px]'
      : 'min-h-[44px] sm:min-h-0 sm:h-10 pl-3 pr-8 text-xs font-medium w-full';

  return (
    <div className={variant === 'compact' ? 'inline-flex flex-col items-start gap-1' : 'w-full space-y-1.5'}>
      <div className={`relative flex items-center ${variant === 'compact' ? '' : 'w-full'}`}>
        <select
          value={request.status}
          disabled={isSaving || isLocked}
          onChange={(e) => handleSelectChange(e.target.value)}
          aria-label={`Update status for ${request.referenceNumber}`}
          className={`appearance-none bg-white border border-[#E6EAE5] rounded-lg text-[#202A24] focus:outline-none focus:border-[#123C2A] focus:ring-1 focus:ring-[#123C2A]/20 transition-colors disabled:bg-[#F7F6F0] disabled:text-[#758078] disabled:cursor-not-allowed ${selectSizeClass}`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#758078]">
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#123C2A]" />
          ) : justSaved ? (
            <Check className="w-3.5 h-3.5 text-[#123C2A]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </span>
      </div>

      {isSaving && (
        <p className="text-[11px] text-[#123C2A] font-medium">Saving to Supabase...</p>
      )}

      {!isSaving && justSaved && variant !== 'compact' && (
        <p className="text-[11px] text-[#123C2A] font-medium">Status saved.</p>
      )}

      {inlineError && (
        <p className="inline-flex items-start gap-1 text-[11px] text-[#991B1B] leading-snug max-w-[260px]">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{inlineError}</span>
        </p>
      )}

      <ConfirmDialog
        open={pendingConfirmStatus !== null}
        onClose={() => setPendingConfirmStatus(null)}
        onConfirm={() => {
          if (pendingConfirmStatus) {
            void commitChange(pendingConfirmStatus);
          }
        }}
        tone="danger"
        title={
          pendingConfirmStatus === 'Cancelled'
            ? `Cancel request ${request.referenceNumber}?`
            : `Return ${request.referenceNumber} to Pending?`
        }
        description={
          pendingConfirmStatus === 'Cancelled'
            ? 'Cancelling will stop dispatch for this service request and release any selected or assigned operator back to Available.'
            : 'Returning this request to Pending will cancel the current operator selection/assignment and release the operator back to Available.'
        }
        confirmLabel={
          pendingConfirmStatus === 'Cancelled' ? 'Confirm Cancellation' : 'Return to Pending'
        }
      />
    </div>
  );
}
