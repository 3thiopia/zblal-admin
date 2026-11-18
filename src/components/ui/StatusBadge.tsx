import {
  OperatorStatus,
  PaymentStatus,
  RequestPriority,
  RequestStatus,
} from '../../types';

type BadgeVariant =
  | OperatorStatus
  | RequestStatus
  | RequestPriority
  | PaymentStatus
  | 'Active'
  | 'Inactive'
  | 'Paused'
  | 'Upcoming'
  | 'Draft'
  | 'Approved'
  | 'Rejected'
  | 'Awarded'
  | 'Forfeited'
  | 'Valid'
  | 'Flagged'
  | 'Invalid'
  | 'Coming Soon'
  | 'Disabled'
  | string;

const BADGE_STYLES: Record<string, string> = {
  // Operator statuses
  Available: 'bg-[#DCE8DF] text-[#123C2A] border-[#C3D9C9]',
  Assigned: 'bg-[#E3ECF7] text-[#1D4ED8] border-[#C7DAFA]',
  Busy: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
  Unavailable: 'bg-[#F1F3F1] text-[#5C665F] border-[#DDE2DD]',
  Suspended: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',

  // Request statuses
  Pending: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
  'Operator Selected': 'bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]',
  'Operator Contacted': 'bg-[#E0F2FE] text-[#075985] border-[#BAE6FD]',
  'In Progress': 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]',
  Completed: 'bg-[#DCE8DF] text-[#123C2A] border-[#C3D9C9]',
  Cancelled: 'bg-[#F1F3F1] text-[#5C665F] border-[#DDE2DD]',

  // Priority
  Standard: 'bg-[#F7F6F0] text-[#4C5750] border-[#E6EAE5]',
  Urgent: 'bg-[#FFEDD5] text-[#9A3412] border-[#FED7AA]',
  Emergency: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',

  // Payments / Active / Arcade
  Paid: 'bg-[#DCE8DF] text-[#123C2A] border-[#C3D9C9]',
  Overdue: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
  Active: 'bg-[#DCE8DF] text-[#123C2A] border-[#C3D9C9]',
  Inactive: 'bg-[#F1F3F1] text-[#5C665F] border-[#DDE2DD]',
  Disabled: 'bg-[#F1F3F1] text-[#5C665F] border-[#DDE2DD]',
  Paused: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
  Upcoming: 'bg-[#E0F2FE] text-[#075985] border-[#BAE6FD]',
  Draft: 'bg-[#F7F6F0] text-[#5C665F] border-[#E6EAE5]',
  Approved: 'bg-[#DCE8DF] text-[#123C2A] border-[#C3D9C9]',
  Rejected: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
  Awarded: 'bg-[#DCE8DF] text-[#123C2A] border-[#C3D9C9]',
  Forfeited: 'bg-[#F1F3F1] text-[#5C665F] border-[#DDE2DD]',
  Valid: 'bg-[#DCE8DF] text-[#123C2A] border-[#C3D9C9]',
  Flagged: 'bg-[#FFEDD5] text-[#9A3412] border-[#FED7AA]',
  Invalid: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
  'Coming Soon': 'bg-[#E0F2FE] text-[#075985] border-[#BAE6FD]',
};

interface StatusBadgeProps {
  status: BadgeVariant;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const style = BADGE_STYLES[status] ?? 'bg-[#F1F3F1] text-[#202A24] border-[#E6EAE5]';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 ${style} ${className}`}
    >
      {status}
    </span>
  );
}
