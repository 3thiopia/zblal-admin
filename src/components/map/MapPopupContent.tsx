import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import { Operator, ServiceRequest } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { formatETB, formatLitres, toTelHref } from '../../utils/formatters';
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

function isCallable(phone: string): boolean {
  return Boolean(phone && phone !== '—' && /\d{4,}/.test(phone));
}

function CustomerDetailCard({ req }: { req: ServiceRequest }) {
  const callable = isCallable(req.customerPhone);
  return (
    <div className="space-y-2.5 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg leading-none shrink-0" aria-hidden="true">
            💩
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#202A24] truncate">{req.customerName}</p>
            <p className="font-mono text-[11px] text-[#758078] truncate">{req.referenceNumber}</p>
          </div>
        </div>
        <StatusBadge status={req.status} />
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t border-[#E6EAE5]">
        <div className="col-span-2 flex items-center justify-between gap-2">
          <dt className="text-[#758078]">Phone</dt>
          <dd className="font-mono font-medium text-[#202A24]">
            {callable ? (
              <a
                href={toTelHref(req.customerPhone)}
                className="inline-flex items-center gap-1 text-[#123C2A] hover:underline"
              >
                <Phone className="w-3 h-3" />
                {req.customerPhone}
              </a>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-[#758078]">Subcity</dt>
          <dd className="font-medium text-[#202A24] truncate">{req.subcityName}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-[#758078]">Neighbourhood</dt>
          <dd className="font-medium text-[#202A24] truncate">{req.neighbourhoodName}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-[#758078]">Priority</dt>
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
        <div className="col-span-2 pt-1.5 border-t border-[#E6EAE5]/70 flex items-center justify-between gap-2 text-[11px]">
          <dt className="text-[#758078]">Map Position</dt>
          <dd className="font-medium text-[#123C2A]">Neighbourhood estimate (Addis Ababa)</dd>
        </div>
      </dl>

      <Link
        to={`/requests/${req.id}`}
        className="w-full inline-flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[36px] px-3 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] transition-colors"
      >
        <span>Open in Service Requests</span>
        <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function OperatorDetailCard({ op }: { op: Operator }) {
  const callable = isCallable(op.primaryPhone);
  return (
    <div className="space-y-2.5 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BlueTankerIcon className="w-7 h-5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#202A24] truncate">{op.fullName}</p>
            <p className="font-mono text-[11px] text-[#758078] truncate">
              {op.vehiclePlate || 'No plate'}
            </p>
          </div>
        </div>
        <StatusBadge status={op.availability} />
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t border-[#E6EAE5]">
        <div className="col-span-2 flex items-center justify-between gap-2">
          <dt className="text-[#758078]">Phone</dt>
          <dd className="font-mono font-medium">
            {callable ? (
              <a
                href={toTelHref(op.primaryPhone)}
                className="inline-flex items-center gap-1 text-[#1D4ED8] font-semibold hover:underline"
              >
                <Phone className="w-3 h-3" />
                {op.primaryPhone}
              </a>
            ) : (
              <span className="text-[#758078]">—</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-[#758078]">Vehicle Type</dt>
          <dd className="font-medium text-[#202A24] truncate">{op.vehicleType}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-[#758078]">Tank Capacity</dt>
          <dd className="font-mono font-medium tabular-nums text-[#202A24]">
            {formatLitres(op.tankCapacityLitres)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-[#758078]">Subcity</dt>
          <dd className="font-medium text-[#202A24] truncate">{op.subcityName}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-[#758078]">Neighbourhood</dt>
          <dd className="font-medium text-[#202A24] truncate">{op.neighbourhoodName}</dd>
        </div>
      </dl>

      {callable && (
        <a
          href={toTelHref(op.primaryPhone)}
          className="w-full inline-flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[36px] px-3 py-2 text-xs font-medium text-white bg-[#1D4ED8] rounded-lg hover:bg-[#1E40AF] transition-colors"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Call Operator ({op.primaryPhone})</span>
        </a>
      )}
    </div>
  );
}

export function MapPopupContent({ group }: { group: NeighbourhoodMapGroup }) {
  const totalCount = group.requests.length + group.operators.length;
  const [tab, setTab] = useState<'all' | 'requests' | 'operators'>('all');
  const [selectedItem, setSelectedItem] = useState<
    | { kind: 'request'; item: ServiceRequest }
    | { kind: 'operator'; item: Operator }
    | null
  >(null);

  if (totalCount === 1) {
    if (group.requests.length === 1) {
      return (
        <div className="w-[min(276px,calc(100vw-88px))] sm:w-[290px] max-w-full p-0.5 text-[#202A24]">
          <CustomerDetailCard req={group.requests[0]} />
        </div>
      );
    }
    if (group.operators.length === 1) {
      return (
        <div className="w-[min(276px,calc(100vw-88px))] sm:w-[290px] max-w-full p-0.5 text-[#202A24]">
          <OperatorDetailCard op={group.operators[0]} />
        </div>
      );
    }
  }

  if (selectedItem) {
    return (
      <div className="w-[min(280px,calc(100vw-88px))] sm:w-[300px] max-w-full p-0.5 text-[#202A24] space-y-2.5">
        <button
          type="button"
          onClick={() => setSelectedItem(null)}
          className="inline-flex items-center gap-1 min-h-[36px] text-xs font-medium text-[#123C2A] hover:underline"
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
    <div className="w-[min(280px,calc(100vw-88px))] sm:w-[310px] max-w-full p-0.5 text-[#202A24] space-y-2.5">
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
            className={`py-1 px-2 rounded-md font-medium transition-colors ${
              tab === 'all' ? 'bg-white text-[#123C2A] shadow-sm' : 'text-[#758078]'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setTab('requests')}
            className={`py-1 px-2 rounded-md font-medium transition-colors ${
              tab === 'requests' ? 'bg-white text-[#123C2A] shadow-sm' : 'text-[#758078]'
            }`}
          >
            💩 {group.requests.length}
          </button>
          <button
            type="button"
            onClick={() => setTab('operators')}
            className={`py-1 px-2 rounded-md font-medium transition-colors ${
              tab === 'operators' ? 'bg-white text-[#1D4ED8] shadow-sm' : 'text-[#758078]'
            }`}
          >
            Drivers ({group.operators.length})
          </button>
        </div>
      )}

      <div className="max-h-[240px] overflow-y-auto divide-y divide-[#E6EAE5] pr-0.5">
        {showRequests &&
          group.requests.map((req) => (
            <button
              key={`req-${req.id}`}
              type="button"
              onClick={() => setSelectedItem({ kind: 'request', item: req })}
              className="w-full py-2 px-1.5 flex items-center justify-between gap-2 text-left hover:bg-[#F7F6F0] rounded-md transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base leading-none shrink-0" aria-hidden="true">
                  💩
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#202A24] truncate">
                    {req.customerName}
                  </p>
                  <p className="text-[11px] font-mono text-[#758078] truncate">
                    {req.referenceNumber} · {req.status}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#758078] shrink-0" />
            </button>
          ))}

        {showOperators &&
          group.operators.map((op) => (
            <button
              key={`op-${op.id}`}
              type="button"
              onClick={() => setSelectedItem({ kind: 'operator', item: op })}
              className="w-full py-2 px-1.5 flex items-center justify-between gap-2 text-left hover:bg-[#F7F6F0] rounded-md transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <BlueTankerIcon className="w-6 h-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#202A24] truncate">
                    {op.fullName}
                  </p>
                  <p className="text-[11px] font-mono text-[#758078] truncate">
                    {op.vehiclePlate || 'No plate'} · {op.availability}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#758078] shrink-0" />
            </button>
          ))}
      </div>
    </div>
  );
}
