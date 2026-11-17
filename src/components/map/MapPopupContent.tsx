import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import { Operator, ServiceRequest } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import {
  formatETB,
  formatLitres,
  isCallablePhone,
  toTelHref,
} from '../../utils/formatters';
import { BlueTankerIcon } from './BlueTankerIcon';

export interface NeighbourhoodMapGroup {
  neighbourhoodId: string;
  neighbourhoodName: string;
  neighbourhoodNameAm: string;
  subcityName: string;
  latitude: number;
  longitude: number;
  requests: ServiceRequest[];
  operators: Operator[];
}

function CustomerDetailCard({ req }: { req: ServiceRequest }) {
  const callable = isCallablePhone(req.customerPhone);
  return (
    <div className="space-y-2.5 text-xs">
      {/* 1. Customer full name + 2. Prominent customer phone number */}
      <div className="flex items-start gap-2.5 min-w-0">
        <span className="text-xl leading-none shrink-0 mt-0.5" aria-hidden="true">
          💩
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#202A24] leading-snug break-words">
            {req.customerName}
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-mono font-semibold text-[#123C2A] break-all">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>{callable ? req.customerPhone : 'No phone on file'}</span>
          </p>
        </div>
      </div>

      {/* 3. Clearly visible green Call Customer button */}
      {callable && (
        <a
          href={toTelHref(req.customerPhone)}
          aria-label={`Call Customer ${req.customerName} at ${req.customerPhone}`}
          className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] px-3.5 py-2 text-xs font-semibold text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] active:scale-[0.99] transition-all"
        >
          <Phone className="w-4 h-4 shrink-0" />
          <span>Call Customer</span>
        </a>
      )}

      {/* 4. Reference, 5. Subcity & Neighbourhood, 6. Priority & Price, 7. Current Status */}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t border-[#E6EAE5]">
        <div className="min-w-0">
          <dt className="text-[11px] text-[#758078]">Reference</dt>
          <dd className="font-mono font-semibold text-[#202A24] truncate mt-0.5">
            {req.referenceNumber}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] text-[#758078]">Request Status</dt>
          <dd className="mt-0.5">
            <StatusBadge status={req.status} />
          </dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="text-[11px] text-[#758078]">Location</dt>
          <dd className="font-medium text-[#202A24] truncate mt-0.5">
            {req.subcityName} · {req.neighbourhoodName}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-[#758078]">Service Priority</dt>
          <dd className="mt-0.5">
            <StatusBadge status={req.priority} />
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-[#758078]">Price</dt>
          <dd className="font-mono font-semibold tabular-nums text-[#123C2A] mt-0.5">
            {formatETB(req.priceEtb)}
          </dd>
        </div>
      </dl>

      {/* View Request direct navigation */}
      <Link
        to={`/requests/${req.id}`}
        className="w-full inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-3.5 py-2 text-xs font-semibold text-[#123C2A] bg-[#F7F6F0] border border-[#123C2A]/30 rounded-lg hover:bg-[#DCE8DF] transition-colors"
      >
        <span>View Request</span>
        <ArrowUpRight className="w-4 h-4 shrink-0" />
      </Link>
    </div>
  );
}

function OperatorDetailCard({ op }: { op: Operator }) {
  const callable = isCallablePhone(op.phone_e164);
  return (
    <div className="space-y-2.5 text-xs">
      {/* 1. Operator full name + 2. Prominent operator phone number */}
      <div className="flex items-start gap-2.5 min-w-0">
        <BlueTankerIcon className="w-7 h-5 shrink-0 mt-1" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#202A24] leading-snug break-words">
            {op.fullName}
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-mono font-semibold text-[#1D4ED8] break-all">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>{callable ? op.phone_e164 : 'No phone on file'}</span>
          </p>
          {op.secondary_phone_e164 && isCallablePhone(op.secondary_phone_e164) && (
            <p className="text-[11px] font-mono text-[#758078] mt-0.5 break-all">
              Alt: {op.secondary_phone_e164}
            </p>
          )}
        </div>
      </div>

      {/* 3. Clearly visible Call Operator button */}
      {callable && (
        <a
          href={toTelHref(op.phone_e164)}
          aria-label={`Call Operator ${op.fullName} at ${op.phone_e164}`}
          className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] px-3.5 py-2 text-xs font-semibold text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] active:scale-[0.99] transition-all"
        >
          <Phone className="w-4 h-4 shrink-0" />
          <span>Call Operator</span>
        </a>
      )}

      {/* 4. Vehicle plate, 5. Vehicle type, 6. Tank capacity, 7. Subcity & Neighbourhood, 8. Availability */}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t border-[#E6EAE5]">
        <div className="min-w-0">
          <dt className="text-[11px] text-[#758078]">Vehicle Plate</dt>
          <dd className="font-mono font-semibold text-[#202A24] truncate mt-0.5">
            {op.vehiclePlate || 'No plate'}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] text-[#758078]">Availability</dt>
          <dd className="mt-0.5">
            <StatusBadge status={op.availability} />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] text-[#758078]">Vehicle Type</dt>
          <dd className="font-medium text-[#202A24] truncate mt-0.5">{op.vehicleType}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] text-[#758078]">Tank Capacity</dt>
          <dd className="font-mono font-semibold tabular-nums text-[#202A24] mt-0.5">
            {formatLitres(op.tankCapacityLitres)}
          </dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="text-[11px] text-[#758078]">Operating Area</dt>
          <dd className="font-medium text-[#202A24] truncate mt-0.5">
            {op.subcityName} · {op.neighbourhoodName}
          </dd>
        </div>
      </dl>

      {/* View Operator direct navigation */}
      <Link
        to={`/operators/${op.id}`}
        className="w-full inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-3.5 py-2 text-xs font-semibold text-[#123C2A] bg-[#F7F6F0] border border-[#123C2A]/30 rounded-lg hover:bg-[#DCE8DF] transition-colors"
      >
        <span>View Operator</span>
        <ArrowUpRight className="w-4 h-4 shrink-0" />
      </Link>
    </div>
  );
}

export function MapPopupContent({
  group,
  variant = 'popup',
}: {
  group: NeighbourhoodMapGroup;
  variant?: 'popup' | 'sheet';
}) {
  const totalCount = group.requests.length + group.operators.length;
  const [tab, setTab] = useState<'all' | 'requests' | 'operators'>('all');
  const [selectedItem, setSelectedItem] = useState<
    | { kind: 'request'; item: ServiceRequest }
    | { kind: 'operator'; item: Operator }
    | null
  >(null);

  const wrapperClass =
    variant === 'sheet'
      ? 'w-full text-[#202A24]'
      : 'w-[min(288px,calc(100vw-88px))] sm:w-[300px] max-w-full p-0.5 text-[#202A24]';

  if (totalCount === 1) {
    if (group.requests.length === 1) {
      return (
        <div className={wrapperClass}>
          <CustomerDetailCard req={group.requests[0]} />
        </div>
      );
    }
    if (group.operators.length === 1) {
      return (
        <div className={wrapperClass}>
          <OperatorDetailCard op={group.operators[0]} />
        </div>
      );
    }
  }

  if (selectedItem) {
    return (
      <div className={`${wrapperClass} space-y-2.5`}>
        <button
          type="button"
          onClick={() => setSelectedItem(null)}
          className="inline-flex items-center gap-1 min-h-[40px] sm:min-h-[32px] text-xs font-medium text-[#123C2A] hover:underline"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to {group.neighbourhoodName} ({totalCount})
        </button>
        {selectedItem.kind === 'request' ? (
          <CustomerDetailCard req={selectedItem.item} />
        ) : (
          <OperatorDetailCard op={selectedItem.item} />
        )}
      </div>
    );
  }

  const showRequests = tab === 'all' || tab === 'requests';
  const showOperators = tab === 'all' || tab === 'operators';

  return (
    <div className={`${wrapperClass} space-y-2.5`}>
      <div className="border-b border-[#E6EAE5] pb-2">
        <p className="text-sm font-semibold text-[#202A24] leading-snug">
          {group.neighbourhoodName}
          {group.neighbourhoodNameAm ? (
            <span className="text-xs font-normal text-[#758078] ml-1.5">
              {group.neighbourhoodNameAm}
            </span>
          ) : null}
        </p>
        <p className="text-[11px] text-[#758078] mt-0.5">
          {group.subcityName} · {group.requests.length} request(s) · {group.operators.length} driver(s)
        </p>
      </div>

      {group.requests.length > 0 && group.operators.length > 0 && (
        <div className="grid grid-cols-3 gap-1 p-0.5 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg text-[11px]">
          <button
            type="button"
            onClick={() => setTab('all')}
            className={`min-h-[36px] sm:min-h-0 py-1 px-2 rounded-md font-medium transition-colors ${
              tab === 'all' ? 'bg-white text-[#123C2A] shadow-sm' : 'text-[#758078]'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setTab('requests')}
            className={`min-h-[36px] sm:min-h-0 py-1 px-2 rounded-md font-medium transition-colors ${
              tab === 'requests' ? 'bg-white text-[#123C2A] shadow-sm' : 'text-[#758078]'
            }`}
          >
            💩 {group.requests.length}
          </button>
          <button
            type="button"
            onClick={() => setTab('operators')}
            className={`min-h-[36px] sm:min-h-0 py-1 px-2 rounded-md font-medium transition-colors ${
              tab === 'operators' ? 'bg-white text-[#1D4ED8] shadow-sm' : 'text-[#758078]'
            }`}
          >
            Drivers ({group.operators.length})
          </button>
        </div>
      )}

      <div className="max-h-[260px] overflow-y-auto divide-y divide-[#E6EAE5] pr-0.5">
        {showRequests &&
          group.requests.map((req) => (
            <button
              key={`req-${req.id}`}
              type="button"
              onClick={() => setSelectedItem({ kind: 'request', item: req })}
              className="w-full py-2.5 px-1.5 flex items-center justify-between gap-2 text-left hover:bg-[#F7F6F0] rounded-md transition-colors min-h-[48px]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base leading-none shrink-0" aria-hidden="true">
                  💩
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#202A24] truncate">
                    {req.customerName}
                  </p>
                  <p className="text-[11px] font-mono text-[#123C2A] truncate">
                    {isCallablePhone(req.customerPhone) ? req.customerPhone : 'No phone'} · {req.referenceNumber}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#758078] shrink-0" />
            </button>
          ))}

        {showOperators &&
          group.operators.map((op) => (
            <button
              key={`op-${op.id}`}
              type="button"
              onClick={() => setSelectedItem({ kind: 'operator', item: op })}
              className="w-full py-2.5 px-1.5 flex items-center justify-between gap-2 text-left hover:bg-[#F7F6F0] rounded-md transition-colors min-h-[48px]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <BlueTankerIcon className="w-6 h-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#202A24] truncate">
                    {op.fullName}
                  </p>
                  <p className="text-[11px] font-mono text-[#1D4ED8] truncate">
                    {isCallablePhone(op.phone_e164) ? op.phone_e164 : 'No phone'} · {op.vehiclePlate || 'No plate'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#758078] shrink-0" />
            </button>
          ))}
      </div>
    </div>
  );
}
