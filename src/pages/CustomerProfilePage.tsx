import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, MapPin, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate, formatDateTime, formatETB, isCallablePhone, toTelHref } from '../utils/formatters';

export function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { customers, requests, operators } = useApp();

  const customer = customers.find((c) => c.id === id);

  const customerRequests = useMemo(() => {
    if (!customer) return [];
    return [...requests]
      .filter((r) => r.customerId === customer.id)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [requests, customer]);

  if (!customer) {
    return (
      <EmptyState
        title="Customer not found"
        description="This customer profile could not be found in Supabase."
        action={
          <Link
            to="/customers"
            className="px-4 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg"
          >
            Back to Customers
          </Link>
        }
      />
    );
  }

  const completedServices = customerRequests.filter((r) => r.status === 'Completed');
  const totalSpent = completedServices.reduce((sum, r) => sum + r.priceEtb, 0);

  return (
    <div className="space-y-5 sm:space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-0 text-xs font-medium text-[#758078] hover:text-[#123C2A] self-start"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Customers
        </Link>

        {isCallablePhone(customer.phone) && (
          <a
            href={toTelHref(customer.phone)}
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21] w-full sm:w-auto"
          >
            <Phone className="w-3.5 h-3.5" />
            Call Customer ({customer.phone})
          </a>
        )}
      </div>

      {/* Summary card */}
      <div className="bg-white border border-[#E6EAE5] rounded-xl p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        <div className="lg:col-span-2 space-y-3 min-w-0">
          <div>
            <h2 className="text-xl font-semibold text-[#202A24] break-words">{customer.fullName}</h2>
            <p className="text-xs text-[#758078] mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{customer.propertyType}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {customer.subcityName} · {customer.neighbourhoodName}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                Registered {formatDate(customer.registeredAt)}
              </span>
            </p>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E6EAE5] text-xs">
            <div>
              <dt className="text-[#758078]">Primary Phone</dt>
              <dd className="font-mono font-medium text-[#202A24] mt-1">
                {isCallablePhone(customer.phone) ? customer.phone : 'No phone on file'}
              </dd>
            </div>
            <div>
              <dt className="text-[#758078]">Total Requests</dt>
              <dd className="font-mono font-semibold tabular-nums text-[#202A24] mt-1">
                {customerRequests.length}
              </dd>
            </div>
            <div>
              <dt className="text-[#758078]">Completed Services</dt>
              <dd className="font-mono font-semibold tabular-nums text-[#123C2A] mt-1">
                {completedServices.length}
              </dd>
            </div>
          </dl>

          {customer.notes && (
            <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg text-xs text-[#202A24]">
              <span className="font-semibold">Site Notes: </span>
              {customer.notes}
            </div>
          )}
        </div>

        <div className="p-4 bg-[#F7F6F0] border border-[#E6EAE5] rounded-xl flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-[#758078]">Completed Service Value</p>
            <p className="text-2xl font-semibold font-mono tabular-nums text-[#123C2A] mt-2">
              {formatETB(totalSpent)}
            </p>
          </div>
          <p className="text-[11px] text-[#758078] mt-4">
            Calculated from {completedServices.length} completed request(s) in Supabase.
          </p>
        </div>
      </div>

      {/* Service request history */}
      <div className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-[#E6EAE5]">
          <h3 className="text-sm font-semibold text-[#202A24]">Service Request History</h3>
        </div>
        {customerRequests.length === 0 ? (
          <p className="p-5 text-xs text-[#758078]">No service requests logged for this customer.</p>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[#E6EAE5]">
              {customerRequests.map((req) => {
                const op = operators.find((o) => o.id === req.assignedOperatorId);
                return (
                  <Link
                    key={req.id}
                    to={`/requests/${req.id}`}
                    className="block p-4 space-y-2 hover:bg-[#F7F6F0]/60 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-[#123C2A]">
                        {req.referenceNumber}
                      </span>
                      <StatusBadge status={req.status} />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-[#202A24] truncate">
                        {req.subcityName} · {req.neighbourhoodName}
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-[#202A24] shrink-0">
                        {formatETB(req.priceEtb)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#758078]">
                      <span className="font-mono">{formatDateTime(req.submittedAt)}</span>
                      <span className="truncate">Op: {op ? op.fullName : '—'}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E6EAE5] bg-[#F7F6F0]/70 text-[11px] font-semibold text-[#758078] uppercase">
                    <th className="py-2.5 px-4">Reference</th>
                    <th className="py-2.5 px-4">Location</th>
                    <th className="py-2.5 px-4">Submitted</th>
                    <th className="py-2.5 px-4">Operator</th>
                    <th className="py-2.5 px-4 text-right">Price</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EAE5]">
                  {customerRequests.map((req) => {
                    const op = operators.find((o) => o.id === req.assignedOperatorId);
                    return (
                      <tr key={req.id} className="hover:bg-[#F7F6F0]/50">
                        <td className="py-3 px-4 font-mono font-medium text-[#123C2A]">
                          <Link to={`/requests/${req.id}`} className="hover:underline">
                            {req.referenceNumber}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-[#202A24]">
                          {req.subcityName} · {req.neighbourhoodName}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#758078]">
                          {formatDateTime(req.submittedAt)}
                        </td>
                        <td className="py-3 px-4 text-[#202A24]">{op ? op.fullName : '—'}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#202A24]">
                          {formatETB(req.priceEtb)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={req.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
