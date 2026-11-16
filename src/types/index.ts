export type StaffRoleSlug = 'super_admin' | 'admin' | 'staff';

export interface StaffProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  role: StaffRoleSlug;
  isActive: boolean;
  createdAt?: string;
}

export type OperatorStatus =
  | 'Available'
  | 'Assigned'
  | 'Busy'
  | 'Unavailable'
  | 'Suspended';

export type VehicleType =
  | 'Light Vacuum Truck'
  | 'Medium Tanker'
  | 'Heavy Vacuum Tanker'
  | 'Industrial Septic Truck';

export interface OperatorVehicleRecord {
  id: string;
  operatorId: string;
  plateNumber: string;
  vehicleType: string;
  tankCapacityLitres: number;
  photoUrl?: string;
  notes?: string;
  isActive: boolean;
}

export interface Operator {
  id: string;
  vehicleId?: string;
  fullName: string;
  primaryPhone: string;
  secondaryPhone?: string;
  vehiclePlate: string;
  vehicleType: string;
  tankCapacityLitres: number;
  vehiclePhotoUrl?: string;
  vehicleNotes?: string;
  subcityId: string;
  subcityName: string;
  neighbourhoodId: string;
  neighbourhoodName: string;
  availability: OperatorStatus;
  isActive: boolean;
  hasActiveVehicle: boolean;
  registeredAt: string;
  internalNotes?: string;
  completedJobsCount: number;
  totalEarningsEtb: number;
}

export type RequestStatus =
  | 'Pending'
  | 'Operator Selected'
  | 'Operator Contacted'
  | 'Assigned'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled';

export type RequestPriority = 'Standard' | 'Urgent' | 'Emergency' | string;

export interface ServicePriorityRecord {
  id: string;
  name: string;
  code: string;
  priceEtb: number;
  description?: string;
  active: boolean;
}

export type CallOutcome =
  | 'Answered - Accepted'
  | 'Answered - Declined'
  | 'No Answer'
  | 'Line Busy'
  | 'Requested Callback';

export interface RequestStatusHistoryItem {
  id: string;
  status: RequestStatus;
  timestamp: string;
  actor: string;
  note?: string;
}

export interface ServiceAssignmentRecord {
  id: string;
  serviceRequestId: string;
  operatorId: string;
  vehicleId?: string;
  assignmentStatus: string;
  selectedAt: string;
  contactedAt?: string;
  callOutcome?: CallOutcome;
  callNotes?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  cancelledAt?: string;
}

export interface AssignmentWorkflowInfo {
  assignmentId?: string;
  selectedOperatorId?: string;
  vehicleId?: string;
  selectedAt?: string;
  contactedAt?: string;
  callOutcome?: CallOutcome;
  callNotes?: string;
  confirmedAt?: string;
  confirmedBy?: string;
}

export interface ServiceRequest {
  id: string;
  referenceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  subcityId: string;
  subcityName: string;
  neighbourhoodId: string;
  neighbourhoodName: string;
  streetLandmark: string;
  priorityId?: string;
  priority: RequestPriority;
  estimatedVolumeLitres: number;
  priceEtb: number;
  submittedAt: string;
  status: RequestStatus;
  assignedOperatorId?: string;
  customerNotes?: string;
  coordinateStatus: 'resolved' | 'coordinates_pending';
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  assignmentWorkflow?: AssignmentWorkflowInfo;
  statusHistory: RequestStatusHistoryItem[];
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  phoneE164?: string;
  secondaryPhone?: string;
  locationId?: string;
  subcityName: string;
  neighbourhoodName: string;
  propertyType: string;
  registeredAt: string;
  notes?: string;
}

export interface Neighbourhood {
  id: string;
  subcityId: string;
  nameEn: string;
  nameAm: string;
  active: boolean;
  latitude?: number | null;
  longitude?: number | null;
  hasCoordinateColumns?: boolean;
}

export interface Subcity {
  id: string;
  nameEn: string;
  nameAm: string;
  active: boolean;
}

export type TransactionType =
  | 'Customer Payment'
  | 'Operator Payout'
  | 'Operational Expense';

export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue' | 'Cancelled';

export interface Transaction {
  id: string;
  reference: string;
  date: string;
  type: TransactionType;
  category: string;
  description: string;
  relatedRequestRef?: string;
  relatedOperatorName?: string;
  relatedCustomerName?: string;
  paymentMethod: string;
  amountEtb: number;
  status: PaymentStatus;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  linkTo?: string;
  category: 'request' | 'operator' | 'finance' | 'system';
}

export interface ActivityFeedItem {
  id: string;
  actor: string;
  action: string;
  subject: string;
  timestamp: string;
  linkTo?: string;
}

export interface SystemSettings {
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminAvatarUrl: string;
  language: 'en' | 'am-en';
  notifyNewRequests: boolean;
  notifyEmergencyPriority: boolean;
  notifyOverduePayments: boolean;
  notifyOperatorStatusChanges: boolean;
  operatingHours: string;
  dispatchPhoneLine: string;
}
