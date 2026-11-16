import { Operator, ServiceAssignmentRecord, ServiceRequest } from '../types';

export type OperatorLocationPriorityTier =
  | 'same_neighbourhood'
  | 'same_subcity'
  | 'other_area';

export type OperatorLocationPriorityLabel =
  | 'Same Neighbourhood'
  | 'Same Subcity'
  | 'Other Area';

export interface PrioritizedOperator {
  operator: Operator;
  priorityRank: 1 | 2 | 3;
  priorityTier: OperatorLocationPriorityTier;
  priorityLabel: OperatorLocationPriorityLabel;
}

export const ACTIVE_ASSIGNMENT_STATUSES = new Set([
  'pending_contact',
  'contacted',
  'confirmed',
  'in_progress',
]);

export function isActiveAssignmentStatus(rawStatus: unknown): boolean {
  const st = String(rawStatus ?? '').trim().toLowerCase();
  return ACTIVE_ASSIGNMENT_STATUSES.has(st);
}

export function getBusyOperatorIds(params: {
  currentRequestId: string;
  requests: ServiceRequest[];
  assignments: ServiceAssignmentRecord[];
}): Set<string> {
  const { currentRequestId, requests, assignments } = params;
  const busyIds = new Set<string>();
  const requestById = new Map(requests.map((r) => [r.id, r]));

  for (const r of requests) {
    if (r.id === currentRequestId) continue;
    if (r.status === 'Completed' || r.status === 'Cancelled') continue;
    if (r.assignedOperatorId) {
      busyIds.add(r.assignedOperatorId);
    }
  }

  for (const a of assignments) {
    if (!a.operatorId || a.serviceRequestId === currentRequestId) continue;
    if (!isActiveAssignmentStatus(a.assignmentStatus)) continue;

    const linkedReq = requestById.get(a.serviceRequestId);
    if (linkedReq && (linkedReq.status === 'Completed' || linkedReq.status === 'Cancelled')) {
      continue;
    }
    busyIds.add(a.operatorId);
  }

  return busyIds;
}

export function getOperatorLocationPriority(
  operator: Operator,
  request: ServiceRequest
): Omit<PrioritizedOperator, 'operator'> {
  if (
    request.neighbourhoodId &&
    operator.neighbourhoodId &&
    operator.neighbourhoodId === request.neighbourhoodId
  ) {
    return {
      priorityRank: 1,
      priorityTier: 'same_neighbourhood',
      priorityLabel: 'Same Neighbourhood',
    };
  }

  if (
    request.subcityId &&
    operator.subcityId &&
    operator.subcityId === request.subcityId
  ) {
    return {
      priorityRank: 2,
      priorityTier: 'same_subcity',
      priorityLabel: 'Same Subcity',
    };
  }

  return {
    priorityRank: 3,
    priorityTier: 'other_area',
    priorityLabel: 'Other Area',
  };
}

export function isOperatorEligibleForRequest(
  operator: Operator,
  busyOperatorIds: Set<string>
): boolean {
  if (operator.availability !== 'Available') return false;
  if (!operator.isActive) return false;
  if (!operator.hasActiveVehicle) return false;
  if (busyOperatorIds.has(operator.id)) return false;
  return true;
}

export function getEligiblePrioritizedOperators(params: {
  request: ServiceRequest;
  operators: Operator[];
  requests: ServiceRequest[];
  assignments: ServiceAssignmentRecord[];
  subcityFilter?: string;
  searchQuery?: string;
}): {
  allEligible: PrioritizedOperator[];
  filtered: PrioritizedOperator[];
  counts: {
    sameNeighbourhood: number;
    sameSubcity: number;
    otherArea: number;
    total: number;
  };
} {
  const {
    request,
    operators,
    requests,
    assignments,
    subcityFilter = 'all',
    searchQuery = '',
  } = params;

  const busyIds = getBusyOperatorIds({
    currentRequestId: request.id,
    requests,
    assignments,
  });

  const allEligible: PrioritizedOperator[] = operators
    .filter((op) => isOperatorEligibleForRequest(op, busyIds))
    .map((operator) => ({
      operator,
      ...getOperatorLocationPriority(operator, request),
    }))
    .sort((a, b) => {
      if (a.priorityRank !== b.priorityRank) {
        return a.priorityRank - b.priorityRank;
      }
      const nameCmp = a.operator.fullName.localeCompare(b.operator.fullName, undefined, {
        sensitivity: 'base',
      });
      if (nameCmp !== 0) return nameCmp;
      return a.operator.id.localeCompare(b.operator.id);
    });

  const counts = {
    sameNeighbourhood: allEligible.filter((item) => item.priorityRank === 1).length,
    sameSubcity: allEligible.filter((item) => item.priorityRank === 2).length,
    otherArea: allEligible.filter((item) => item.priorityRank === 3).length,
    total: allEligible.length,
  };

  const q = searchQuery.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, '');

  const filtered = allEligible.filter(({ operator }) => {
    if (subcityFilter && subcityFilter !== 'all' && operator.subcityId !== subcityFilter) {
      return false;
    }
    if (q) {
      const nameMatch = operator.fullName.toLowerCase().includes(q);
      const plateMatch = operator.vehiclePlate.toLowerCase().includes(q);
      const primaryPhoneMatch = operator.primaryPhone.toLowerCase().includes(q);
      const secondaryPhoneMatch = operator.secondaryPhone
        ? operator.secondaryPhone.toLowerCase().includes(q)
        : false;
      const digitsMatch =
        qDigits.length >= 2 &&
        (operator.primaryPhone.replace(/\D/g, '').includes(qDigits) ||
          Boolean(operator.secondaryPhone?.replace(/\D/g, '').includes(qDigits)));

      if (
        !nameMatch &&
        !plateMatch &&
        !primaryPhoneMatch &&
        !secondaryPhoneMatch &&
        !digitsMatch
      ) {
        return false;
      }
    }
    return true;
  });

  return { allEligible, filtered, counts };
}
