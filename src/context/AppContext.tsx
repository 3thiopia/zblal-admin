import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityFeedItem,
  CallOutcome,
  Customer,
  Neighbourhood,
  NotificationItem,
  Operator,
  OperatorStatus,
  RequestStatus,
  ServiceAssignmentRecord,
  ServicePriorityRecord,
  ServiceRequest,
  Subcity,
  SystemSettings,
  Transaction,
} from '../types';
import {
  cancelAssignmentRecord,
  confirmAssignmentRecord,
  createLocationRecord,
  createOperatorWithVehicle,
  createSubcityRecord,
  loadAllAdminData,
  logAssignmentCallOutcome,
  removeOperatorRecord,
  selectOrUpdateAssignment,
  toggleLocationStatusRecord,
  toggleSubcityStatusRecord,
  updateOperatorAndVehicle,
  updateServiceRequestStatusRecord,
} from '../services/supabaseService';
import { useAuth } from './AuthContext';
import { ADMIN_AVATAR_IMAGE } from '../lib/assets';
import { supabase } from '../lib/supabase';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'info' | 'warning' | 'error';
}

interface AppContextValue {
  operators: Operator[];
  requests: ServiceRequest[];
  customers: Customer[];
  subcities: Subcity[];
  neighbourhoods: Neighbourhood[];
  priorities: ServicePriorityRecord[];
  assignments: ServiceAssignmentRecord[];
  transactions: Transaction[];
  notifications: NotificationItem[];
  activityFeed: ActivityFeedItem[];
  settings: SystemSettings;
  toasts: ToastMessage[];
  loadingData: boolean;
  dataError: string | null;
  dataRevision: number;
  updatingRequestIds: Record<string, boolean>;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  registerModalOpen: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  setMobileNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setRegisterModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  refreshData: () => Promise<void>;
  addToast: (title: string, description?: string, variant?: ToastMessage['variant']) => void;
  dismissToast: (id: string) => void;
  addOperator: (input: {
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
  }) => Promise<void>;
  updateOperator: (id: string, updates: Partial<Operator>) => Promise<void>;
  deleteOperator: (id: string) => Promise<void>;
  changeOperatorAvailability: (id: string, availability: OperatorStatus, note?: string) => Promise<void>;
  selectOperatorForRequest: (requestId: string, operatorId: string) => Promise<void>;
  recordOperatorCallOutcome: (requestId: string, outcome: CallOutcome, callNotes?: string) => Promise<void>;
  confirmRequestAssignment: (requestId: string) => Promise<void>;
  cancelRequestAssignment: (requestId: string) => Promise<void>;
  updateRequestStatus: (
    requestId: string,
    status: RequestStatus
  ) => Promise<{ ok: boolean; error?: string }>;
  toggleSubcityActive: (subcityId: string) => Promise<void>;
  toggleNeighbourhoodActive: (neighbourhoodId: string) => Promise<void>;
  addSubcity: (nameEn: string, nameAm: string) => Promise<void>;
  addNeighbourhood: (subcityId: string, nameEn: string, nameAm: string) => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  updateSettings: (updates: Partial<SystemSettings>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, staffProfile } = useAuth();

  const [operators, setOperators] = useState<Operator[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [subcities, setSubcities] = useState<Subcity[]>([]);
  const [neighbourhoods, setNeighbourhoods] = useState<Neighbourhood[]>([]);
  const [priorities, setPriorities] = useState<ServicePriorityRecord[]>([]);
  const [assignments, setAssignments] = useState<ServiceAssignmentRecord[]>([]);

  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [dataRevision, setDataRevision] = useState<number>(0);
  const [updatingRequestIds, setUpdatingRequestIds] = useState<Record<string, boolean>>({});
  const updatingRequestIdsRef = useRef<Record<string, boolean>>({});

  const [readNotificationIds, setReadNotificationIds] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  const [settings, setSettings] = useState<SystemSettings>({
    adminName: staffProfile?.fullName ?? 'Zblal Staff',
    adminEmail: staffProfile?.email ?? '',
    adminPhone: staffProfile?.phone ?? '',
    adminAvatarUrl: ADMIN_AVATAR_IMAGE,
    language: 'en',
    notifyNewRequests: true,
    notifyEmergencyPriority: true,
    notifyOverduePayments: true,
    notifyOperatorStatusChanges: false,
    operatingHours: '06:00 – 21:00 EAT (Mon–Sun)',
    dispatchPhoneLine: '+251 11 667 4200',
  });

  useEffect(() => {
    if (staffProfile) {
      setSettings((prev) => ({
        ...prev,
        adminName: staffProfile.fullName,
        adminEmail: staffProfile.email,
        adminPhone: staffProfile.phone ?? prev.adminPhone,
      }));
    }
  }, [staffProfile]);

  const addToast = useCallback(
    (title: string, description?: string, variant: ToastMessage['variant'] = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, title, description, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const refreshData = useCallback(async () => {
    if (!isAuthenticated) {
      setOperators([]);
      setRequests([]);
      setCustomers([]);
      setSubcities([]);
      setNeighbourhoods([]);
      setPriorities([]);
      setAssignments([]);
      return;
    }

    setLoadingData(true);
    setDataError(null);
    try {
      const dataset = await loadAllAdminData();
      setSubcities(dataset.subcities);
      setNeighbourhoods(dataset.neighbourhoods);
      setPriorities(dataset.priorities);
      setCustomers(dataset.customers);
      setOperators(dataset.operators);
      setAssignments(dataset.assignments);
      setRequests(dataset.requests);
      setDataRevision((rev) => rev + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load data from Supabase.';
      setDataError(msg);
    } finally {
      setLoadingData(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  // Keep requests, assignments, and operator statuses synchronized via Supabase Realtime
  useEffect(() => {
    const client = supabase;
    if (!isAuthenticated || !client) return;

    let debounceTimer: number | null = null;
    const scheduleRefresh = () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        void refreshData();
      }, 250);
    };

    const channel = client
      .channel('zblal-admin-live-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_requests' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_assignments' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicle_operators' },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      void client.removeChannel(channel);
    };
  }, [isAuthenticated, refreshData]);

  // Derive real transactions strictly from database service_requests + service_priorities
  const transactions = useMemo<Transaction[]>(() => {
    return requests
      .filter((r) => r.status !== 'Cancelled' && r.priceEtb > 0)
      .map((r) => ({
        id: `tx-req-${r.id}`,
        reference: r.referenceNumber,
        date: r.submittedAt,
        type: 'Customer Payment' as const,
        category: `${r.priority} Service`,
        description: `${r.subcityName} · ${r.neighbourhoodName}`,
        relatedRequestRef: r.referenceNumber,
        relatedCustomerName: r.customerName,
        paymentMethod: 'Service Order',
        amountEtb: r.priceEtb,
        status: r.status === 'Completed' ? 'Paid' : 'Pending',
      }));
  }, [requests]);

  // Derive real notifications from pending/emergency requests
  const notifications = useMemo<NotificationItem[]>(() => {
    return requests
      .filter((r) => r.status === 'Pending' || r.status === 'Operator Contacted')
      .slice(0, 6)
      .map((r) => ({
        id: `notif-${r.id}`,
        title:
          String(r.priority).toLowerCase() === 'emergency'
            ? 'Emergency request pending'
            : `Request ${r.status}`,
        message: `${r.referenceNumber} · ${r.customerName} (${r.subcityName})`,
        timestamp: r.submittedAt,
        read: Boolean(readNotificationIds[`notif-${r.id}`]),
        linkTo: `/requests/${r.id}`,
        category: 'request' as const,
      }));
  }, [requests, readNotificationIds]);

  const activityFeed = useMemo<ActivityFeedItem[]>(() => {
    return [...requests]
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 6)
      .map((r) => ({
        id: `act-${r.id}`,
        actor: r.customerName,
        action: `status: ${r.status} on`,
        subject: `${r.referenceNumber} (${r.subcityName} · ${r.neighbourhoodName})`,
        timestamp: r.submittedAt,
        linkTo: `/requests/${r.id}`,
      }));
  }, [requests]);

  const addOperator: AppContextValue['addOperator'] = async (input) => {
    try {
      await createOperatorWithVehicle(input);
      await refreshData();
      addToast('Operator registered', `${input.fullName} and vehicle saved to Supabase.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to register operator.';
      addToast('Registration failed', msg, 'warning');
      throw err;
    }
  };

  const updateOperator: AppContextValue['updateOperator'] = async (id, updates) => {
    const existing = operators.find((o) => o.id === id);
    try {
      await updateOperatorAndVehicle(id, existing?.vehicleId, updates);
      await refreshData();
      addToast('Operator updated', 'Changes saved to Supabase.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update operator.';
      addToast('Update failed', msg, 'warning');
      throw err;
    }
  };

  const deleteOperator: AppContextValue['deleteOperator'] = async (id) => {
    try {
      await removeOperatorRecord(id);
      await refreshData();
      addToast('Operator removed', 'Operator and vehicle deleted from Supabase.', 'info');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove operator.';
      addToast('Remove failed', msg, 'warning');
      throw err;
    }
  };

  const changeOperatorAvailability: AppContextValue['changeOperatorAvailability'] = async (
    id,
    availability,
    note
  ) => {
    const existing = operators.find((o) => o.id === id);
    try {
      await updateOperatorAndVehicle(id, existing?.vehicleId, {
        availability,
        internalNotes: note
          ? `${existing?.internalNotes ? `${existing.internalNotes}\n` : ''}${note}`
          : undefined,
      });
      await refreshData();
      addToast('Availability updated', `Operator is now ${availability}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update availability.';
      addToast('Update failed', msg, 'warning');
    }
  };

  const selectOperatorForRequest: AppContextValue['selectOperatorForRequest'] = async (
    requestId,
    operatorId
  ) => {
    if (!staffProfile) return;
    const op = operators.find((o) => o.id === operatorId);
    try {
      await selectOrUpdateAssignment({
        serviceRequestId: requestId,
        operatorId,
        vehicleId: op?.vehicleId,
        staffUserId: staffProfile.userId,
      });
      await refreshData();
      addToast('Operator selected', `Call ${op?.fullName ?? 'operator'} and record call outcome.`, 'info');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to select operator.';
      addToast('Selection failed', msg, 'warning');
    }
  };

  const recordOperatorCallOutcome: AppContextValue['recordOperatorCallOutcome'] = async (
    requestId,
    outcome,
    callNotes
  ) => {
    const req = requests.find((r) => r.id === requestId);
    const assignmentId = req?.assignmentWorkflow?.assignmentId;
    if (!assignmentId) {
      addToast('No operator selected', 'Select an operator first before recording call outcome.', 'warning');
      return;
    }
    try {
      await logAssignmentCallOutcome({
        assignmentId,
        serviceRequestId: requestId,
        outcome,
        callNotes,
      });
      await refreshData();
      addToast('Call outcome recorded', `Saved as "${outcome}" in service_assignments.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to log call outcome.';
      addToast('Save failed', msg, 'warning');
    }
  };

  const confirmRequestAssignment: AppContextValue['confirmRequestAssignment'] = async (requestId) => {
    const req = requests.find((r) => r.id === requestId);
    const assignmentId = req?.assignmentWorkflow?.assignmentId;
    const operatorId = req?.assignmentWorkflow?.selectedOperatorId;
    if (!assignmentId || !operatorId) return;

    try {
      await confirmAssignmentRecord({
        assignmentId,
        serviceRequestId: requestId,
        operatorId,
        staffName: staffProfile?.fullName ?? settings.adminName,
      });
      await refreshData();
      addToast('Assignment confirmed', `${req?.referenceNumber} assigned.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to confirm assignment.';
      addToast('Confirmation failed', msg, 'warning');
    }
  };

  const cancelRequestAssignment: AppContextValue['cancelRequestAssignment'] = async (requestId) => {
    const req = requests.find((r) => r.id === requestId);
    if (!req) return;
    try {
      await cancelAssignmentRecord({
        assignmentId: req.assignmentWorkflow?.assignmentId,
        serviceRequestId: requestId,
        operatorId: req.assignedOperatorId || req.assignmentWorkflow?.selectedOperatorId,
      });
      await refreshData();
      addToast('Assignment cancelled', `${req.referenceNumber} returned to Pending.`, 'info');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel assignment.';
      addToast('Cancel failed', msg, 'warning');
    }
  };

  const updateRequestStatus: AppContextValue['updateRequestStatus'] = async (requestId, status) => {
    if (updatingRequestIdsRef.current[requestId]) {
      return { ok: false, error: 'A status update is already in progress.' };
    }
    const req = requests.find((r) => r.id === requestId);
    if (!req) {
      const msg = 'Service request not found.';
      addToast('Update failed', msg, 'error');
      return { ok: false, error: msg };
    }
    if (req.status === status) {
      return { ok: true };
    }

    updatingRequestIdsRef.current[requestId] = true;
    setUpdatingRequestIds((prev) => ({ ...prev, [requestId]: true }));

    try {
      await updateServiceRequestStatusRecord({
        serviceRequestId: requestId,
        status,
        currentStatus: req.status,
        assignedOperatorId: req.assignedOperatorId,
        selectedOperatorId: req.assignmentWorkflow?.selectedOperatorId,
        assignmentId: req.assignmentWorkflow?.assignmentId,
      });
      await refreshData();
      addToast(
        'Status updated',
        `${req.referenceNumber} saved as ${status} in Supabase.`
      );
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update request status.';
      addToast('Status update failed', msg, 'error');
      return { ok: false, error: msg };
    } finally {
      delete updatingRequestIdsRef.current[requestId];
      setUpdatingRequestIds((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
    }
  };

  const toggleSubcityActive = async (subcityId: string) => {
    const target = subcities.find((s) => s.id === subcityId);
    if (!target) return;
    try {
      await toggleSubcityStatusRecord(subcityId, !target.active);
      await refreshData();
      addToast('Subcity updated', `${target.nameEn} status updated.`);
    } catch (err) {
      addToast('Update failed', err instanceof Error ? err.message : 'Failed to update subcity.', 'warning');
    }
  };

  const toggleNeighbourhoodActive = async (neighbourhoodId: string) => {
    const target = neighbourhoods.find((n) => n.id === neighbourhoodId);
    if (!target) return;
    try {
      await toggleLocationStatusRecord(neighbourhoodId, !target.active);
      await refreshData();
      addToast('Location updated', `${target.nameEn} status updated.`);
    } catch (err) {
      addToast('Update failed', err instanceof Error ? err.message : 'Failed to update location.', 'warning');
    }
  };

  const addSubcity = async (nameEn: string, nameAm: string) => {
    try {
      await createSubcityRecord(nameEn, nameAm);
      await refreshData();
      addToast('Subcity added', `${nameEn} created in Supabase.`);
    } catch (err) {
      addToast('Create failed', err instanceof Error ? err.message : 'Failed to add subcity.', 'warning');
    }
  };

  const addNeighbourhood = async (subcityId: string, nameEn: string, nameAm: string) => {
    try {
      await createLocationRecord(subcityId, nameEn, nameAm);
      await refreshData();
      addToast('Location added', `${nameEn} created in Supabase.`);
    } catch (err) {
      addToast('Create failed', err instanceof Error ? err.message : 'Failed to add location.', 'warning');
    }
  };

  const markNotificationRead = (id: string) => {
    setReadNotificationIds((prev) => ({ ...prev, [id]: true }));
  };

  const markAllNotificationsRead = () => {
    const next: Record<string, boolean> = {};
    notifications.forEach((n) => {
      next[n.id] = true;
    });
    setReadNotificationIds(next);
    addToast('Notifications cleared', 'All notifications marked as read.', 'info');
  };

  const updateSettings = (updates: Partial<SystemSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    addToast('Preferences updated', 'Session preferences updated.');
  };

  return (
    <AppContext.Provider
      value={{
        operators,
        requests,
        customers,
        subcities,
        neighbourhoods,
        priorities,
        assignments,
        transactions,
        notifications,
        activityFeed,
        settings,
        toasts,
        loadingData,
        dataError,
        dataRevision,
        updatingRequestIds,
        sidebarCollapsed,
        mobileNavOpen,
        registerModalOpen,
        setSidebarCollapsed,
        setMobileNavOpen,
        setRegisterModalOpen,
        refreshData,
        addToast,
        dismissToast,
        addOperator,
        updateOperator,
        deleteOperator,
        changeOperatorAvailability,
        selectOperatorForRequest,
        recordOperatorCallOutcome,
        confirmRequestAssignment,
        cancelRequestAssignment,
        updateRequestStatus,
        toggleSubcityActive,
        toggleNeighbourhoodActive,
        addSubcity,
        addNeighbourhood,
        markNotificationRead,
        markAllNotificationsRead,
        updateSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
