import { CallOutcome } from '../types';

export const ALLOWED_CALL_OUTCOMES: readonly CallOutcome[] = [
  'no_answer',
  'answered',
  'accepted',
  'declined',
  'call_back_requested',
] as const;

export const CALL_OUTCOME_OPTIONS: ReadonlyArray<{
  value: CallOutcome;
  label: string;
}> = [
  { value: 'accepted', label: 'Accepted (Ready for Dispatch)' },
  { value: 'answered', label: 'Answered (Call Answered)' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'declined', label: 'Declined (Operator Declined)' },
  { value: 'call_back_requested', label: 'Call Back Requested' },
];

const ALLOWED_SET = new Set<string>(ALLOWED_CALL_OUTCOMES);

export function toDbCallOutcome(raw: unknown): CallOutcome | null {
  if (raw === null || raw === undefined) return null;
  const normalized = String(raw).trim().toLowerCase();
  if (
    !normalized ||
    normalized === 'null' ||
    normalized === 'none' ||
    normalized === 'pending' ||
    normalized === 'not_contacted'
  ) {
    return null;
  }

  if (ALLOWED_SET.has(normalized)) {
    return normalized as CallOutcome;
  }

  if (normalized === 'answered - accepted') return 'accepted';
  if (normalized === 'answered - declined') return 'declined';
  if (normalized === 'no answer' || normalized === 'line busy') return 'no_answer';
  if (
    normalized === 'requested callback' ||
    normalized === 'call back requested' ||
    normalized === 'callback requested'
  ) {
    return 'call_back_requested';
  }

  throw new Error(
    `Unsupported call_outcome value "${String(raw)}". Allowed values: ${ALLOWED_CALL_OUTCOMES.join(', ')}.`
  );
}

export function normalizeCallOutcome(raw: unknown): CallOutcome | undefined {
  if (raw === null || raw === undefined) return undefined;
  const normalized = String(raw).trim().toLowerCase();
  if (!normalized) return undefined;
  if (ALLOWED_SET.has(normalized)) return normalized as CallOutcome;
  if (normalized === 'answered - accepted') return 'accepted';
  if (normalized === 'answered - declined') return 'declined';
  if (normalized === 'no answer' || normalized === 'line busy') return 'no_answer';
  if (
    normalized === 'requested callback' ||
    normalized === 'call back requested' ||
    normalized === 'callback requested'
  ) {
    return 'call_back_requested';
  }
  return undefined;
}

export function formatCallOutcomeLabel(outcome?: CallOutcome | string | null): string {
  if (!outcome) return 'Not Contacted';
  switch (String(outcome).trim().toLowerCase()) {
    case 'accepted':
      return 'Accepted';
    case 'answered':
      return 'Answered';
    case 'no_answer':
      return 'No Answer';
    case 'declined':
      return 'Declined';
    case 'call_back_requested':
      return 'Call Back Requested';
    default:
      return String(outcome);
  }
}
