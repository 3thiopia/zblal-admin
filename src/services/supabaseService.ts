import { getSupabaseClient } from '../lib/supabase';
import {
  CallOutcome,
  Customer,
  Neighbourhood,
  Operator,
  OperatorStatus,
  OperatorVehicleRecord,
  RequestStatus,
  RequestStatusHistoryItem,
  ServiceAssignmentRecord,
  ServicePriorityRecord,
  ServiceRequest,
  StaffProfile,
  StaffRoleSlug,
  Subcity,
} from '../types';
import { isActiveAssignmentStatus } from '../utils/operatorSelection';

const ALLOWED_STAFF_ROLES: StaffRoleSlug[] = ['super_admin', 'admin', 'staff'];

function normalizeOperatorStatus(raw: unknown): OperatorStatus {
  const str = String(raw ?? 'Available').trim().toLowerCase();
  if (str === 'assigned') return 'Assigned';
  if (str === 'busy') return 'Busy';
  if (str === 'unavailable') return 'Unavailable';
  if (str === 'suspended') return 'Suspended';
  return 'Available';
}

function normalizeRequestStatus(raw: unknown): RequestStatus {
  const str = String(raw ?? 'Pending').trim().toLowerCase();
  if (str === 'operator selected' || str === 'operator_selected') return 'Operator Selected';
  if (str === 'operator contacted' || str === 'operator_contacted') return 'Operator Contacted';
  if (str === 'assigned') return 'Assigned';
  if (str === 'in progress' || str === 'in_progress') return 'In Progress';
  if (str === 'completed') return 'Completed';
  if (str === 'cancelled' || str === 'canceled') return 'Cancelled';
  return 'Pending';
}

type DbStatusFormat = 'title' | 'snake_lower';
let detectedRequestStatusFormat: DbStatusFormat = 'title';

function detectDbStatusFormat(rows: Array<Record<string, unknown>>): DbStatusFormat {
  for (const r of rows) {
    const raw = typeof r.status === 'string' ? r.status.trim() : '';
    if (!raw) continue;
    if (
      raw === 'pending' ||
      raw === 'operator_selected' ||
      raw === 'operator_contacted' ||
      raw === 'assigned' ||
      raw === 'in_progress' ||
      raw === 'completed' ||
      raw === 'cancelled'
    ) {
      return 'snake_lower';
    }
    if (
      raw === 'Pending' ||
      raw === 'Operator Selected' ||
      raw === 'Operator Contacted' ||
      raw === 'Assigned' ||
      raw === 'In Progress' ||
      raw === 'Completed' ||
      raw === 'Cancelled'
    ) {
      return 'title';
    }
  }
  return detectedRequestStatusFormat;
}

function toDbRequestStatus(status: RequestStatus, format: DbStatusFormat): string {
  if (format === 'snake_lower') {
    if (status === 'Operator Selected') return 'operator_selected';
    if (status === 'Operator Contacted') return 'operator_contacted';
    if (status === 'In Progress') return 'in_progress';
    return status.toLowerCase();
  }
  return status;
}

function isCheckConstraintError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === '23514' ||
    String(err.message ?? '').toLowerCase().includes('check constraint')
  );
}

function extractCustomerPhone(row: Record<string, unknown> | null | undefined): string {
  if (!row) return '';
  const raw =
    row.phone_e164 ??
    row.phone ??
    row.phone_number ??
    row.mobile ??
    row.contact_phone ??
    '';
  return String(raw).trim();
}

export function isValidAddisAbabaCoordinate(
  lat?: number | null,
  lng?: number | null
): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 8.70 &&
    lat <= 9.25 &&
    lng >= 38.50 &&
    lng <= 39.08
  );
}

export interface ResolvedLocationResult {
  locationId: string;
  coordinateStatus: 'resolved' | 'coordinates_pending';
  latitude: number | null;
  longitude: number | null;
}

export function resolveNeighbourhoodCoordinates(
  location: Neighbourhood | undefined
): ResolvedLocationResult | null {
  if (!location) return null;
  const hasCoords = isValidAddisAbabaCoordinate(location.latitude, location.longitude);
  return {
    locationId: location.id,
    coordinateStatus: hasCoords ? 'resolved' : 'coordinates_pending',
    latitude: hasCoords ? (location.latitude as number) : null,
    longitude: hasCoords ? (location.longitude as number) : null,
  };
}

export function matchActiveAddisLocationByName(
  locations: Neighbourhood[],
  queryName: string,
  subcityId?: string
): ResolvedLocationResult | null {
  const normalizedQuery = queryName.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalizedQuery) return null;

  const matched = locations.find((nb) => {
    if (!nb.active) return false;
    if (subcityId && nb.subcityId !== subcityId) return false;
    const en = nb.nameEn.trim().toLowerCase().replace(/\s+/g, ' ');
    const am = nb.nameAm.trim().toLowerCase().replace(/\s+/g, ' ');
    return en === normalizedQuery || am === normalizedQuery;
  });

  return resolveNeighbourhoodCoordinates(matched);
}

function normalizeRole(raw: unknown): StaffRoleSlug | null {
  const role = String(raw ?? '').trim().toLowerCase();
  if (role === 'super_admin' || role === 'admin' || role === 'staff') {
    return role;
  }
  return null;
}

export async function fetchStaffProfileForUser(userId: string): Promise<StaffProfile | null> {
  const supabase = getSupabaseClient();

  // Support either `id = auth.uid()` or `user_id = auth.uid()` schema conventions
  let row: Record<string, unknown> | null = null;

  const byId = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (!byId.error && byId.data) {
    row = byId.data as Record<string, unknown>;
  } else {
    const byUserId = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (byUserId.error) {
      if (byId.error && !byId.error.message.includes('does not exist')) {
        throw new Error(byId.error.message);
      }
      throw new Error(byUserId.error.message);
    }
    row = (byUserId.data as Record<string, unknown> | null) ?? null;
  }

  if (!row) return null;

  const role = normalizeRole(row.role);
  if (!role || !ALLOWED_STAFF_ROLES.includes(role)) {
    return null;
  }

  const isActive =
    row.is_active !== false &&
    row.active !== false &&
    String(row.status ?? 'active').toLowerCase() !== 'inactive' &&
    String(row.status ?? 'active').toLowerCase() !== 'suspended';

  if (!isActive) {
    return null;
  }

  return {
    id: String(row.id),
    userId: String(row.user_id ?? row.id),
    fullName: String(row.full_name ?? row.name ?? row.email ?? 'Zblal Staff'),
    email: String(row.email ?? ''),
    phone: row.phone ? String(row.phone) : undefined,
    role,
    isActive,
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

export interface LoadedAdminDataset {
  subcities: Subcity[];
  neighbourhoods: Neighbourhood[];
  priorities: ServicePriorityRecord[];
  customers: Customer[];
  operators: Operator[];
  vehicles: OperatorVehicleRecord[];
  assignments: ServiceAssignmentRecord[];
  requests: ServiceRequest[];
}

export const ACTIVE_MAP_REQUEST_STATUSES: RequestStatus[] = [
  'Pending',
  'Operator Selected',
  'Operator Contacted',
  'Assigned',
  'In Progress',
];

export const ACTIVE_MAP_OPERATOR_STATUSES: OperatorStatus[] = [
  'Available',
  'Assigned',
  'Busy',
];

export function isActiveMapRequestStatus(status: RequestStatus): boolean {
  return status !== 'Completed' && status !== 'Cancelled';
}

export function isActiveMapOperatorStatus(status: OperatorStatus): boolean {
  return status === 'Available' || status === 'Assigned' || status === 'Busy';
}

async function fetchRequestsRows(activeOnly: boolean) {
  const supabase = getSupabaseClient();
  const buildQuery = (selectExpr: string) => {
    let q = supabase.from('service_requests').select(selectExpr);
    if (activeOnly) {
      q = q.or(
        'status.is.null,status.not.in.("Completed","Cancelled","completed","cancelled","canceled")'
      );
    }
    return q;
  };

  const joined = await buildQuery('*, customer:customers(*)');
  if (
    joined.error &&
    (joined.error.message.toLowerCase().includes('relationship') ||
      joined.error.message.toLowerCase().includes('schema cache'))
  ) {
    return buildQuery('*');
  }
  return joined;
}

async function fetchOperatorRows(activeOnly: boolean) {
  const supabase = getSupabaseClient();
  if (!activeOnly) {
    return supabase.from('vehicle_operators').select('*');
  }

  const filtered = await supabase
    .from('vehicle_operators')
    .select('*')
    .or(
      'availability_status.is.null,availability_status.not.in.("Unavailable","Suspended","unavailable","suspended")'
    );

  if (
    filtered.error &&
    filtered.error.message.toLowerCase().includes('availability_status')
  ) {
    return supabase.from('vehicle_operators').select('*');
  }
  return filtered;
}

function buildAdminDataset(params: {
  subcityRows: Array<Record<string, unknown>>;
  locationRows: Array<Record<string, unknown>>;
  priorityRows: Array<Record<string, unknown>>;
  customerRows: Array<Record<string, unknown>>;
  operatorRows: Array<Record<string, unknown>>;
  vehicleRows: Array<Record<string, unknown>>;
  requestRows: Array<Record<string, unknown>>;
  assignmentRows: Array<Record<string, unknown>>;
}): LoadedAdminDataset {
  const {
    subcityRows,
    locationRows,
    priorityRows,
    customerRows,
    operatorRows,
    vehicleRows,
    requestRows,
    assignmentRows,
  } = params;

  detectedRequestStatusFormat = detectDbStatusFormat(requestRows);

  const subcities: Subcity[] = subcityRows.map((r) => ({
    id: String(r.id),
    nameEn: String(r.name_en ?? r.name ?? ''),
    nameAm: String(r.name_am ?? r.amharic_name ?? ''),
    active: r.is_active !== false && r.active !== false,
  }));
  const subcityMap = new Map(subcities.map((s) => [s.id, s]));

  const parseCoord = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const num = Number(v);
    return Number.isFinite(num) ? num : null;
  };

  const neighbourhoods: Neighbourhood[] = locationRows.map((r) => ({
    id: String(r.id),
    subcityId: String(r.subcity_id ?? ''),
    nameEn: String(r.name_en ?? r.name ?? ''),
    nameAm: String(r.name_am ?? r.amharic_name ?? ''),
    active: r.is_active !== false && r.active !== false,
    latitude: parseCoord(r.latitude ?? r.lat),
    longitude: parseCoord(r.longitude ?? r.lng ?? r.lon),
    hasCoordinateColumns: 'latitude' in r && 'longitude' in r,
  }));
  const locationMap = new Map(neighbourhoods.map((n) => [n.id, n]));

  const priorities: ServicePriorityRecord[] = priorityRows.map((r) => ({
    id: String(r.id),
    name: String(r.name ?? r.label ?? r.title ?? 'Standard'),
    code: String(r.code ?? r.slug ?? r.name ?? 'standard'),
    priceEtb: Number(r.price_etb ?? r.price ?? r.base_price ?? 0),
    description: r.description ? String(r.description) : undefined,
    active: r.is_active !== false && r.active !== false,
  }));
  const priorityMap = new Map(priorities.map((p) => [p.id, p]));

  const customers: Customer[] = customerRows.map((r) => {
    const sc = subcityMap.get(String(r.subcity_id ?? ''));
    const locId =
      r.location_id || r.neighbourhood_id
        ? String(r.location_id ?? r.neighbourhood_id)
        : undefined;
    const nb = locId ? locationMap.get(locId) : undefined;
    const extractedPhone = extractCustomerPhone(r);
    return {
      id: String(r.id),
      fullName: String(r.full_name ?? r.name ?? 'Customer'),
      phone: extractedPhone,
      phoneE164: r.phone_e164 ? String(r.phone_e164).trim() : extractedPhone || undefined,
      secondaryPhone:
        r.secondary_phone_e164 || r.secondary_phone
          ? String(r.secondary_phone_e164 ?? r.secondary_phone).trim()
          : undefined,
      locationId: locId,
      subcityName: sc?.nameEn ?? String(r.subcity_name ?? '—'),
      neighbourhoodName:
        nb?.nameEn ?? String(r.location_name ?? r.neighbourhood_name ?? '—'),
      propertyType: String(r.property_type ?? 'Residential'),
      registeredAt: String(r.created_at ?? r.registered_at ?? new Date().toISOString()),
      notes: r.notes ? String(r.notes) : undefined,
    };
  });
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const vehicles: OperatorVehicleRecord[] = vehicleRows.map((r) => ({
    id: String(r.id),
    operatorId: String(r.operator_id ?? ''),
    plateNumber: String(r.plate_number ?? r.vehicle_plate ?? ''),
    vehicleType: String(r.vehicle_type ?? 'Medium Tanker'),
    tankCapacityLitres: Number(
      r.tank_capacity_litres ?? r.tank_capacity ?? r.capacity_litres ?? 0
    ),
    photoUrl:
      r.photo_url || r.vehicle_photo_url
        ? String(r.photo_url ?? r.vehicle_photo_url)
        : undefined,
    notes:
      r.notes || r.vehicle_notes ? String(r.notes ?? r.vehicle_notes) : undefined,
    isActive:
      r.is_active !== false &&
      r.active !== false &&
      String(r.status ?? 'active').trim().toLowerCase() !== 'inactive',
  }));
  const activeVehicleByOperatorId = new Map<string, OperatorVehicleRecord>();
  const fallbackVehicleByOperatorId = new Map<string, OperatorVehicleRecord>();
  vehicles.forEach((v) => {
    if (!v.operatorId) return;
    if (!fallbackVehicleByOperatorId.has(v.operatorId)) {
      fallbackVehicleByOperatorId.set(v.operatorId, v);
    }
    if (v.isActive && !activeVehicleByOperatorId.has(v.operatorId)) {
      activeVehicleByOperatorId.set(v.operatorId, v);
    }
  });

  const assignments: ServiceAssignmentRecord[] = assignmentRows.map((r) => ({
    id: String(r.id),
    serviceRequestId: String(r.service_request_id ?? r.request_id ?? ''),
    operatorId: String(r.operator_id ?? ''),
    vehicleId: r.vehicle_id ? String(r.vehicle_id) : undefined,
    assignmentStatus: String(r.assignment_status ?? 'pending_contact'),
    selectedAt: String(r.selected_at ?? r.created_at ?? new Date().toISOString()),
    contactedAt: r.contacted_at ? String(r.contacted_at) : undefined,
    callOutcome: r.call_outcome ? (String(r.call_outcome) as CallOutcome) : undefined,
    callNotes: r.call_notes ? String(r.call_notes) : undefined,
    confirmedAt: r.confirmed_at ? String(r.confirmed_at) : undefined,
    confirmedBy:
      r.confirmed_by || r.assigned_by
        ? String(r.confirmed_by ?? r.assigned_by)
        : undefined,
    cancelledAt: r.cancelled_at ? String(r.cancelled_at) : undefined,
  }));

  // Compute real request & operator linkage
  const completedCountByOperator = new Map<string, number>();
  const earningsByOperator = new Map<string, number>();

  const requestPriceById = new Map<string, number>();
  const requestStatusById = new Map<string, RequestStatus>();

  requestRows.forEach((r) => {
    const reqId = String(r.id);
    const pId = r.priority_id ? String(r.priority_id) : undefined;
    const priorityObj = pId ? priorityMap.get(pId) : undefined;
    const price = Number(priorityObj?.priceEtb ?? r.price_etb ?? r.total_price ?? 0);
    requestPriceById.set(reqId, price);
    requestStatusById.set(reqId, normalizeRequestStatus(r.status));
  });

  assignments.forEach((a) => {
    const reqStatus = requestStatusById.get(a.serviceRequestId);
    const assignStatus = a.assignmentStatus.trim().toLowerCase();
    if (reqStatus === 'Completed' || assignStatus === 'completed') {
      completedCountByOperator.set(
        a.operatorId,
        (completedCountByOperator.get(a.operatorId) ?? 0) + 1
      );
      earningsByOperator.set(
        a.operatorId,
        (earningsByOperator.get(a.operatorId) ?? 0) +
          (requestPriceById.get(a.serviceRequestId) ?? 0)
      );
    }
  });

  const operators: Operator[] = operatorRows.map((r) => {
    const id = String(r.id);
    const activeVehicle = activeVehicleByOperatorId.get(id);
    const vehicle = activeVehicle ?? fallbackVehicleByOperatorId.get(id);
    const locId = String(r.location_id ?? r.neighbourhood_id ?? '');
    const loc = locationMap.get(locId);
    const scId = String(r.subcity_id ?? loc?.subcityId ?? '');
    const sc = subcityMap.get(scId);
    const opIsActive =
      r.is_active !== false &&
      r.active !== false &&
      String(r.status ?? 'active').trim().toLowerCase() !== 'inactive';

    return {
      id,
      vehicleId: vehicle?.id,
      fullName: String(r.full_name ?? r.name ?? ''),
      primaryPhone: String(r.primary_phone ?? r.phone ?? ''),
      secondaryPhone: r.secondary_phone ? String(r.secondary_phone) : undefined,
      vehiclePlate: vehicle?.plateNumber ?? '',
      vehicleType: vehicle?.vehicleType ?? 'Medium Tanker',
      tankCapacityLitres: vehicle?.tankCapacityLitres ?? 0,
      vehiclePhotoUrl: vehicle?.photoUrl,
      vehicleNotes: vehicle?.notes,
      subcityId: scId,
      subcityName: sc?.nameEn ?? String(r.subcity_name ?? '—'),
      neighbourhoodId: locId,
      neighbourhoodName: loc?.nameEn ?? String(r.location_name ?? '—'),
      availability: normalizeOperatorStatus(
        r.availability_status ?? r.availability ?? r.status
      ),
      isActive: opIsActive,
      hasActiveVehicle: Boolean(activeVehicle),
      registeredAt: String(r.created_at ?? r.registered_at ?? new Date().toISOString()),
      internalNotes:
        r.internal_notes || r.notes ? String(r.internal_notes ?? r.notes) : undefined,
      completedJobsCount: completedCountByOperator.get(id) ?? 0,
      totalEarningsEtb: earningsByOperator.get(id) ?? 0,
    };
  });

  const requests: ServiceRequest[] = requestRows.map((r) => {
    const id = String(r.id);
    const customerId = String(r.customer_id ?? '');
    const joinedSource = r.customer ?? r.customers;
    const joinedCustomerRaw =
      joinedSource && !Array.isArray(joinedSource)
        ? (joinedSource as Record<string, unknown>)
        : Array.isArray(joinedSource) && joinedSource.length > 0
        ? (joinedSource[0] as Record<string, unknown>)
        : null;
    const customer = customerMap.get(customerId);
    const resolvedCustomerName = joinedCustomerRaw
      ? String(
          joinedCustomerRaw.full_name ??
            joinedCustomerRaw.name ??
            customer?.fullName ??
            'Unknown Customer'
        )
      : customer?.fullName ?? 'Unknown Customer';
    const resolvedCustomerPhone =
      extractCustomerPhone(joinedCustomerRaw) ||
      customer?.phoneE164?.trim() ||
      customer?.phone?.trim() ||
      '—';
    const locId = String(
      r.location_id ??
        r.neighbourhood_id ??
        joinedCustomerRaw?.location_id ??
        joinedCustomerRaw?.neighbourhood_id ??
        customer?.locationId ??
        ''
    );
    const loc = locationMap.get(locId);
    const scId = String(
      r.subcity_id ?? joinedCustomerRaw?.subcity_id ?? loc?.subcityId ?? ''
    );
    const sc = subcityMap.get(scId);
    const reqLat = parseCoord(r.latitude ?? r.lat);
    const reqLng = parseCoord(r.longitude ?? r.lng);
    const resolvedLat = isValidAddisAbabaCoordinate(reqLat, reqLng)
      ? reqLat
      : isValidAddisAbabaCoordinate(loc?.latitude, loc?.longitude)
      ? loc?.latitude ?? null
      : null;
    const resolvedLng = isValidAddisAbabaCoordinate(reqLat, reqLng)
      ? reqLng
      : isValidAddisAbabaCoordinate(loc?.latitude, loc?.longitude)
      ? loc?.longitude ?? null
      : null;
    const coordinateStatus: 'resolved' | 'coordinates_pending' =
      isValidAddisAbabaCoordinate(resolvedLat, resolvedLng)
        ? 'resolved'
        : 'coordinates_pending';
    const priorityId = r.priority_id ? String(r.priority_id) : undefined;
    const priorityRecord = priorityId ? priorityMap.get(priorityId) : undefined;

    const activeAssignment = assignments
      .filter((a) => {
        if (a.serviceRequestId !== id) return false;
        const st = a.assignmentStatus.trim().toLowerCase();
        return st !== 'cancelled' && st !== 'canceled' && st !== 'declined';
      })
      .sort((a, b) => {
        const aActive = isActiveAssignmentStatus(a.assignmentStatus) ? 1 : 0;
        const bActive = isActiveAssignmentStatus(b.assignmentStatus) ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        return new Date(b.selectedAt).getTime() - new Date(a.selectedAt).getTime();
      })[0];

    const rawStatus = normalizeRequestStatus(r.status);
    let derivedStatus = rawStatus;
    if (rawStatus === 'Pending' && activeAssignment) {
      const aSt = activeAssignment.assignmentStatus.trim().toLowerCase();
      if (aSt === 'in_progress') derivedStatus = 'In Progress';
      else if (aSt === 'confirmed') derivedStatus = 'Assigned';
      else if (aSt === 'contacted') derivedStatus = 'Operator Contacted';
      else if (aSt === 'pending_contact') derivedStatus = 'Operator Selected';
    }

    const assignedOperatorId =
      activeAssignment &&
      (derivedStatus === 'Assigned' ||
        derivedStatus === 'In Progress' ||
        derivedStatus === 'Completed' ||
        activeAssignment.confirmedAt)
        ? activeAssignment.operatorId
        : undefined;

    const submittedAt = String(
      r.created_at ?? r.submitted_at ?? new Date().toISOString()
    );

    const statusHistory: RequestStatusHistoryItem[] = [
      {
        id: `sh-init-${id}`,
        status: 'Pending',
        timestamp: submittedAt,
        actor: customer?.fullName ?? 'Customer Submission',
        note: 'Service request recorded in Supabase.',
      },
    ];

    if (activeAssignment?.selectedAt) {
      statusHistory.push({
        id: `sh-sel-${activeAssignment.id}`,
        status: 'Operator Selected',
        timestamp: activeAssignment.selectedAt,
        actor: activeAssignment.confirmedBy ?? 'Dispatch Staff',
      });
    }
    if (activeAssignment?.contactedAt) {
      statusHistory.push({
        id: `sh-cnt-${activeAssignment.id}`,
        status: 'Operator Contacted',
        timestamp: activeAssignment.contactedAt,
        actor: activeAssignment.confirmedBy ?? 'Dispatch Staff',
        note: activeAssignment.callOutcome
          ? `${activeAssignment.callOutcome}${
              activeAssignment.callNotes ? ` — ${activeAssignment.callNotes}` : ''
            }`
          : undefined,
      });
    }
    if (activeAssignment?.confirmedAt || derivedStatus === 'Assigned') {
      statusHistory.push({
        id: `sh-cnf-${activeAssignment?.id ?? id}`,
        status: 'Assigned',
        timestamp: activeAssignment?.confirmedAt ?? submittedAt,
        actor: activeAssignment?.confirmedBy ?? 'Dispatch Staff',
      });
    }
    if (
      derivedStatus === 'In Progress' ||
      derivedStatus === 'Completed' ||
      derivedStatus === 'Cancelled'
    ) {
      statusHistory.push({
        id: `sh-cur-${id}`,
        status: derivedStatus,
        timestamp: String(r.updated_at ?? submittedAt),
        actor: 'Operations Staff',
      });
    }

    return {
      id,
      referenceNumber: String(
        r.reference_number ?? r.reference_code ?? `REQ-${id.slice(0, 8)}`
      ),
      customerId,
      customerName: resolvedCustomerName,
      customerPhone: resolvedCustomerPhone,
      subcityId: scId,
      subcityName: sc?.nameEn ?? '—',
      neighbourhoodId: locId,
      neighbourhoodName: loc?.nameEn ?? '—',
      streetLandmark: String(
        r.street_landmark ?? r.address_landmark ?? r.landmark ?? r.address ?? '—'
      ),
      priorityId,
      priority: priorityRecord?.name ?? String(r.priority ?? 'Standard'),
      estimatedVolumeLitres: Number(
        r.estimated_volume_litres ?? r.tank_size_litres ?? 0
      ),
      priceEtb: Number(
        priorityRecord?.priceEtb ?? r.price_etb ?? r.total_price ?? 0
      ),
      submittedAt,
      status: derivedStatus,
      assignedOperatorId,
      customerNotes:
        r.customer_notes || r.notes
          ? String(r.customer_notes ?? r.notes)
          : undefined,
      coordinateStatus,
      locationLatitude: resolvedLat,
      locationLongitude: resolvedLng,
      assignmentWorkflow: activeAssignment
        ? {
            assignmentId: activeAssignment.id,
            selectedOperatorId: activeAssignment.operatorId,
            vehicleId: activeAssignment.vehicleId,
            selectedAt: activeAssignment.selectedAt,
            contactedAt: activeAssignment.contactedAt,
            callOutcome: activeAssignment.callOutcome,
            callNotes: activeAssignment.callNotes,
            confirmedAt: activeAssignment.confirmedAt,
            confirmedBy: activeAssignment.confirmedBy,
          }
        : undefined,
      statusHistory,
    };
  });

  return {
    subcities,
    neighbourhoods,
    priorities,
    customers,
    operators,
    vehicles,
    assignments,
    requests,
  };
}

export async function loadAllAdminData(): Promise<LoadedAdminDataset> {
  const supabase = getSupabaseClient();

  const [
    subcitiesRes,
    locationsRes,
    prioritiesRes,
    customersRes,
    operatorsRes,
    vehiclesRes,
    requestsRes,
    assignmentsRes,
  ] = await Promise.all([
    supabase.from('subcities').select('*'),
    supabase.from('locations').select('*'),
    supabase.from('service_priorities').select('*'),
    supabase.from('customers').select('*'),
    fetchOperatorRows(false),
    supabase.from('operator_vehicles').select('*'),
    fetchRequestsRows(false),
    supabase.from('service_assignments').select('*'),
  ]);

  const errors = [
    subcitiesRes.error && `subcities: ${subcitiesRes.error.message}`,
    locationsRes.error && `locations: ${locationsRes.error.message}`,
    prioritiesRes.error && `service_priorities: ${prioritiesRes.error.message}`,
    customersRes.error && `customers: ${customersRes.error.message}`,
    operatorsRes.error && `vehicle_operators: ${operatorsRes.error.message}`,
    vehiclesRes.error && `operator_vehicles: ${vehiclesRes.error.message}`,
    requestsRes.error && `service_requests: ${requestsRes.error.message}`,
    assignmentsRes.error && `service_assignments: ${assignmentsRes.error.message}`,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(`Database query failed (${errors.join(' | ')})`);
  }

  return buildAdminDataset({
    subcityRows: (subcitiesRes.data ?? []) as Array<Record<string, unknown>>,
    locationRows: (locationsRes.data ?? []) as Array<Record<string, unknown>>,
    priorityRows: (prioritiesRes.data ?? []) as Array<Record<string, unknown>>,
    customerRows: (customersRes.data ?? []) as Array<Record<string, unknown>>,
    operatorRows: (operatorsRes.data ?? []) as Array<Record<string, unknown>>,
    vehicleRows: (vehiclesRes.data ?? []) as Array<Record<string, unknown>>,
    requestRows: (requestsRes.data ?? []) as unknown as Array<Record<string, unknown>>,
    assignmentRows: (assignmentsRes.data ?? []) as Array<Record<string, unknown>>,
  });
}

export interface ActiveMapRecords {
  requests: ServiceRequest[];
  operators: Operator[];
  subcities: Subcity[];
  neighbourhoods: Neighbourhood[];
}

/**
 * Fetches current active operational records for the Admin Map directly from Supabase:
 * - Excludes Completed and Cancelled service requests at the query level and in client normalization
 * - Excludes Unavailable and Suspended operators while keeping Available, Assigned, and Busy operators
 */
export async function loadActiveMapRecords(): Promise<ActiveMapRecords> {
  const supabase = getSupabaseClient();

  const [
    subcitiesRes,
    locationsRes,
    prioritiesRes,
    customersRes,
    operatorsRes,
    vehiclesRes,
    requestsRes,
    assignmentsRes,
  ] = await Promise.all([
    supabase.from('subcities').select('*'),
    supabase.from('locations').select('*'),
    supabase.from('service_priorities').select('*'),
    supabase.from('customers').select('*'),
    fetchOperatorRows(true),
    supabase.from('operator_vehicles').select('*'),
    fetchRequestsRows(true),
    supabase.from('service_assignments').select('*'),
  ]);

  const errors = [
    subcitiesRes.error && `subcities: ${subcitiesRes.error.message}`,
    locationsRes.error && `locations: ${locationsRes.error.message}`,
    prioritiesRes.error && `service_priorities: ${prioritiesRes.error.message}`,
    customersRes.error && `customers: ${customersRes.error.message}`,
    operatorsRes.error && `vehicle_operators: ${operatorsRes.error.message}`,
    vehiclesRes.error && `operator_vehicles: ${vehiclesRes.error.message}`,
    requestsRes.error && `service_requests: ${requestsRes.error.message}`,
    assignmentsRes.error && `service_assignments: ${assignmentsRes.error.message}`,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(`Database map query failed (${errors.join(' | ')})`);
  }

  const dataset = buildAdminDataset({
    subcityRows: (subcitiesRes.data ?? []) as Array<Record<string, unknown>>,
    locationRows: (locationsRes.data ?? []) as Array<Record<string, unknown>>,
    priorityRows: (prioritiesRes.data ?? []) as Array<Record<string, unknown>>,
    customerRows: (customersRes.data ?? []) as Array<Record<string, unknown>>,
    operatorRows: (operatorsRes.data ?? []) as Array<Record<string, unknown>>,
    vehicleRows: (vehiclesRes.data ?? []) as Array<Record<string, unknown>>,
    requestRows: (requestsRes.data ?? []) as unknown as Array<Record<string, unknown>>,
    assignmentRows: (assignmentsRes.data ?? []) as Array<Record<string, unknown>>,
  });

  return {
    subcities: dataset.subcities,
    neighbourhoods: dataset.neighbourhoods,
    requests: dataset.requests.filter((r) => isActiveMapRequestStatus(r.status)),
    operators: dataset.operators.filter((op) =>
      isActiveMapOperatorStatus(op.availability)
    ),
  };
}

export async function createOperatorWithVehicle(input: {
  fullName: string;
  primaryPhone: string;
  secondaryPhone?: string;
  vehiclePlate: string;
  vehicleType: string;
  tankCapacityLitres: number;
  vehiclePhotoUrl?: string;
  vehicleNotes?: string;
  subcityId: string;
  neighbourhoodId: string;
  availability: OperatorStatus;
  internalNotes?: string;
}): Promise<void> {
  const supabase = getSupabaseClient();

  const { data: opData, error: opError } = await supabase
    .from('vehicle_operators')
    .insert({
      full_name: input.fullName,
      primary_phone: input.primaryPhone,
      secondary_phone: input.secondaryPhone || null,
      subcity_id: input.subcityId || null,
      location_id: input.neighbourhoodId || null,
      availability_status: input.availability,
      internal_notes: input.internalNotes || null,
    })
    .select('*')
    .single();

  if (opError || !opData) {
    throw new Error(opError?.message ?? 'Failed to insert into vehicle_operators.');
  }

  const operatorId = String((opData as Record<string, unknown>).id);

  const { error: vehError } = await supabase.from('operator_vehicles').insert({
    operator_id: operatorId,
    plate_number: input.vehiclePlate,
    vehicle_type: input.vehicleType,
    tank_capacity_litres: input.tankCapacityLitres,
    photo_url: input.vehiclePhotoUrl || null,
    notes: input.vehicleNotes || null,
  });

  if (vehError) {
    // Best-effort cleanup if vehicle insertion fails
    await supabase.from('vehicle_operators').delete().eq('id', operatorId);
    throw new Error(`Vehicle registration failed: ${vehError.message}`);
  }
}

export async function updateOperatorAndVehicle(
  operatorId: string,
  vehicleId: string | undefined,
  updates: Partial<Operator>
): Promise<void> {
  const supabase = getSupabaseClient();

  const operatorPayload: Record<string, unknown> = {};
  if (updates.fullName !== undefined) operatorPayload.full_name = updates.fullName;
  if (updates.primaryPhone !== undefined) operatorPayload.primary_phone = updates.primaryPhone;
  if (updates.secondaryPhone !== undefined) {
    operatorPayload.secondary_phone = updates.secondaryPhone || null;
  }
  if (updates.subcityId !== undefined) operatorPayload.subcity_id = updates.subcityId || null;
  if (updates.neighbourhoodId !== undefined) {
    operatorPayload.location_id = updates.neighbourhoodId || null;
  }
  if (updates.availability !== undefined) {
    operatorPayload.availability_status = updates.availability;
  }
  if (updates.internalNotes !== undefined) {
    operatorPayload.internal_notes = updates.internalNotes || null;
  }

  if (Object.keys(operatorPayload).length > 0) {
    const { error } = await supabase
      .from('vehicle_operators')
      .update(operatorPayload)
      .eq('id', operatorId);
    if (error) throw new Error(error.message);
  }

  const vehiclePayload: Record<string, unknown> = {};
  if (updates.vehiclePlate !== undefined) vehiclePayload.plate_number = updates.vehiclePlate;
  if (updates.vehicleType !== undefined) vehiclePayload.vehicle_type = updates.vehicleType;
  if (updates.tankCapacityLitres !== undefined) {
    vehiclePayload.tank_capacity_litres = updates.tankCapacityLitres;
  }
  if (updates.vehiclePhotoUrl !== undefined) {
    vehiclePayload.photo_url = updates.vehiclePhotoUrl || null;
  }
  if (updates.vehicleNotes !== undefined) {
    vehiclePayload.notes = updates.vehicleNotes || null;
  }

  if (Object.keys(vehiclePayload).length > 0) {
    if (vehicleId) {
      const { error } = await supabase
        .from('operator_vehicles')
        .update(vehiclePayload)
        .eq('id', vehicleId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('operator_vehicles').insert({
        operator_id: operatorId,
        ...vehiclePayload,
      });
      if (error) throw new Error(error.message);
    }
  }
}

export async function removeOperatorRecord(operatorId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error: vehErr } = await supabase
    .from('operator_vehicles')
    .delete()
    .eq('operator_id', operatorId);
  if (vehErr) throw new Error(vehErr.message);

  const { error: opErr } = await supabase
    .from('vehicle_operators')
    .delete()
    .eq('id', operatorId);
  if (opErr) throw new Error(opErr.message);
}

export async function selectOrUpdateAssignment(params: {
  serviceRequestId: string;
  operatorId: string;
  vehicleId?: string;
  staffUserId: string;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  // Enforce single active assignment per request
  const { data: existingRows, error: checkErr } = await supabase
    .from('service_assignments')
    .select('id, assignment_status, operator_id')
    .eq('service_request_id', params.serviceRequestId);

  if (checkErr) throw new Error(checkErr.message);

  const activeRows = (existingRows ?? []).filter((row: Record<string, unknown>) =>
    isActiveAssignmentStatus(row.assignment_status)
  );

  if (activeRows.length > 0) {
    const existing = activeRows[0] as Record<string, unknown>;
    const existingSt = String(existing.assignment_status ?? '').trim().toLowerCase();
    if (existingSt === 'confirmed' || existingSt === 'in_progress') {
      throw new Error(
        'This service request already has an active confirmed assignment. Cancel the current assignment first.'
      );
    }

    const { error: updErr } = await supabase
      .from('service_assignments')
      .update({
        operator_id: params.operatorId,
        vehicle_id: params.vehicleId || null,
        assignment_status: 'pending_contact',
        selected_at: now,
        assigned_by: params.staffUserId,
      })
      .eq('id', String(existing.id));
    if (updErr) throw new Error(updErr.message);
  } else {
    const { error: insErr } = await supabase.from('service_assignments').insert({
      service_request_id: params.serviceRequestId,
      operator_id: params.operatorId,
      vehicle_id: params.vehicleId || null,
      assignment_status: 'pending_contact',
      selected_at: now,
      assigned_by: params.staffUserId,
    });
    if (insErr) throw new Error(insErr.message);
  }

  const { error: reqSelErr } = await supabase
    .from('service_requests')
    .update({ status: toDbRequestStatus('Operator Selected', detectedRequestStatusFormat) })
    .eq('id', params.serviceRequestId);
  if (reqSelErr && !isCheckConstraintError(reqSelErr)) {
    throw new Error(reqSelErr.message);
  }
}

export async function logAssignmentCallOutcome(params: {
  assignmentId: string;
  serviceRequestId: string;
  outcome: CallOutcome;
  callNotes?: string;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const { error: assignErr } = await supabase
    .from('service_assignments')
    .update({
      assignment_status: 'contacted',
      contacted_at: now,
      call_outcome: params.outcome,
      call_notes: params.callNotes || null,
    })
    .eq('id', params.assignmentId);

  if (assignErr) throw new Error(assignErr.message);

  const { error: reqErr } = await supabase
    .from('service_requests')
    .update({ status: toDbRequestStatus('Operator Contacted', detectedRequestStatusFormat) })
    .eq('id', params.serviceRequestId);

  if (reqErr && !isCheckConstraintError(reqErr)) {
    throw new Error(reqErr.message);
  }
}

export async function confirmAssignmentRecord(params: {
  assignmentId: string;
  serviceRequestId: string;
  operatorId: string;
  staffName: string;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const { error: assignErr } = await supabase
    .from('service_assignments')
    .update({
      assignment_status: 'confirmed',
      confirmed_at: now,
      confirmed_by: params.staffName,
    })
    .eq('id', params.assignmentId);

  if (assignErr) throw new Error(assignErr.message);

  await persistServiceRequestStatus(params.serviceRequestId, 'Assigned');

  const { error: opErr } = await supabase
    .from('vehicle_operators')
    .update({ availability_status: 'Assigned' })
    .eq('id', params.operatorId);
  if (opErr) throw new Error(opErr.message);
}

export async function cancelAssignmentRecord(params: {
  assignmentId?: string;
  serviceRequestId: string;
  operatorId?: string;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  if (params.assignmentId) {
    const { error: assignErr } = await supabase
      .from('service_assignments')
      .update({
        assignment_status: 'cancelled',
        cancelled_at: now,
      })
      .eq('id', params.assignmentId);
    if (assignErr) throw new Error(assignErr.message);
  }

  await persistServiceRequestStatus(params.serviceRequestId, 'Pending');

  if (params.operatorId) {
    const { error: opErr } = await supabase
      .from('vehicle_operators')
      .update({ availability_status: 'Available' })
      .eq('id', params.operatorId);
    if (opErr) throw new Error(opErr.message);
  }
}

async function persistServiceRequestStatus(
  serviceRequestId: string,
  status: RequestStatus
): Promise<void> {
  const supabase = getSupabaseClient();
  const primaryValue = toDbRequestStatus(status, detectedRequestStatusFormat);
  const firstAttempt = await supabase
    .from('service_requests')
    .update({ status: primaryValue })
    .eq('id', serviceRequestId)
    .select('id, status');

  if (firstAttempt.error) {
    if (isCheckConstraintError(firstAttempt.error)) {
      const altFormat: DbStatusFormat =
        detectedRequestStatusFormat === 'title' ? 'snake_lower' : 'title';
      const altValue = toDbRequestStatus(status, altFormat);
      if (altValue !== primaryValue) {
        const retryAttempt = await supabase
          .from('service_requests')
          .update({ status: altValue })
          .eq('id', serviceRequestId)
          .select('id, status');
        if (!retryAttempt.error) {
          detectedRequestStatusFormat = altFormat;
          if (!retryAttempt.data || retryAttempt.data.length === 0) {
            throw new Error(
              'Permission denied or service request not found (0 rows updated).'
            );
          }
          return;
        }
        throw new Error(
          `Database status constraint rejected "${status}": ${retryAttempt.error.message}`
        );
      }
      throw new Error(
        `Database status constraint rejected "${status}": ${firstAttempt.error.message}`
      );
    }
    throw new Error(firstAttempt.error.message);
  }

  if (!firstAttempt.data || firstAttempt.data.length === 0) {
    throw new Error(
      'Permission denied or service request not found (0 rows updated).'
    );
  }
}

export async function updateServiceRequestStatusRecord(params: {
  serviceRequestId: string;
  status: RequestStatus;
  currentStatus?: RequestStatus;
  assignedOperatorId?: string;
  selectedOperatorId?: string;
  assignmentId?: string;
}): Promise<void> {
  const supabase = getSupabaseClient();

  if (
    (params.status === 'In Progress' || params.status === 'Completed') &&
    !params.assignedOperatorId
  ) {
    throw new Error(
      `Cannot mark request as ${params.status} before an operator assignment is confirmed.`
    );
  }

  if (params.status === 'Assigned' && !params.assignedOperatorId) {
    throw new Error(
      'Cannot set status to Assigned directly. Select an operator, record the call outcome, and confirm assignment on the detail page.'
    );
  }

  if (
    params.status === 'Operator Selected' ||
    params.status === 'Operator Contacted'
  ) {
    throw new Error(
      `Status "${params.status}" is managed through the operator assignment workflow on the request detail page.`
    );
  }

  // Returning an assigned or in-progress/selected request to Pending releases the assignment & operator
  if (
    params.status === 'Pending' &&
    (params.assignmentId || params.assignedOperatorId || params.selectedOperatorId)
  ) {
    await cancelAssignmentRecord({
      assignmentId: params.assignmentId,
      serviceRequestId: params.serviceRequestId,
      operatorId: params.assignedOperatorId || params.selectedOperatorId,
    });
    return;
  }

  await persistServiceRequestStatus(params.serviceRequestId, params.status);

  if (params.assignmentId) {
    const now = new Date().toISOString();
    const assignmentUpdate =
      params.status === 'Completed'
        ? { assignment_status: 'completed' }
        : params.status === 'Cancelled'
        ? { assignment_status: 'cancelled', cancelled_at: now }
        : params.status === 'In Progress'
        ? { assignment_status: 'in_progress' }
        : params.status === 'Assigned'
        ? { assignment_status: 'confirmed' }
        : null;

    if (assignmentUpdate) {
      const { error: assignErr } = await supabase
        .from('service_assignments')
        .update(assignmentUpdate)
        .eq('id', params.assignmentId);
      if (assignErr) throw new Error(assignErr.message);
    }
  }

  const operatorToUpdate =
    params.assignedOperatorId ||
    (params.status === 'Cancelled' ? params.selectedOperatorId : undefined);

  if (operatorToUpdate) {
    const nextOpStatus: OperatorStatus | null =
      params.status === 'In Progress'
        ? 'Busy'
        : params.status === 'Assigned'
        ? 'Assigned'
        : params.status === 'Completed' || params.status === 'Cancelled'
        ? 'Available'
        : null;
    if (nextOpStatus) {
      const { error: opErr } = await supabase
        .from('vehicle_operators')
        .update({ availability_status: nextOpStatus })
        .eq('id', operatorToUpdate);
      if (opErr) throw new Error(opErr.message);
    }
  }
}

export async function toggleSubcityStatusRecord(id: string, active: boolean): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('subcities').update({ is_active: active }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function toggleLocationStatusRecord(id: string, active: boolean): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('locations').update({ is_active: active }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function createSubcityRecord(nameEn: string, nameAm: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('subcities').insert({
    name_en: nameEn.trim(),
    name_am: nameAm.trim(),
    is_active: true,
  });
  if (error) throw new Error(error.message);
}

export async function createLocationRecord(
  subcityId: string,
  nameEn: string,
  nameAm: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('locations').insert({
    subcity_id: subcityId,
    name_en: nameEn.trim(),
    name_am: nameAm.trim(),
    is_active: true,
  });
  if (error) throw new Error(error.message);
}
