import React, { useState } from 'react';
import {
  Shield,
  Database,
  CheckCircle2,
  Edit3,
  Clock,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatETB } from '../utils/formatters';
import { ServicePriorityRecord } from '../types';
import { EditPriorityModal } from '../components/settings/EditPriorityModal';

type SettingsTab = 'profile' | 'access' | 'notifications' | 'general';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
};

function formatTimeframeLabel(minHours: number, maxHours: number): string {
  if (minHours <= 0 && maxHours <= 0) return 'Timeframe not set';
  if (minHours === 1 && maxHours === 24) return '1–24 hours (within 24 hours)';
  if (minHours === 24 && maxHours === 48) return '24–48 hours (1–2 days)';
  if (minHours === 72 && maxHours === 120) return '72–120 hours (3–5 days)';
  if (minHours === maxHours) {
    if (minHours % 24 === 0 && minHours >= 24) {
      const days = minHours / 24;
      return `${minHours} hours (${days} ${days === 1 ? 'day' : 'days'})`;
    }
    return `${minHours} hours`;
  }
  if (minHours >= 24 && minHours % 24 === 0 && maxHours % 24 === 0) {
    return `${minHours}–${maxHours} hours (${minHours / 24}–${maxHours / 24} days)`;
  }
  return `${minHours}–${maxHours} hours`;
}

export function SettingsPage() {
  const { settings, updateSettings, priorities } = useApp();
  const { staffProfile, isConfigured } = useAuth();

  const [tab, setTab] = useState<SettingsTab>('profile');
  const [editingPriority, setEditingPriority] = useState<ServicePriorityRecord | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Session-only dispatch preferences form
  const [operatingHours, setOperatingHours] = useState(settings.operatingHours);
  const [dispatchLine, setDispatchLine] = useState(settings.dispatchPhoneLine);

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      operatingHours,
      dispatchPhoneLine: dispatchLine,
    });
  };

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h2 className="text-lg font-semibold text-[#202A24]">System &amp; Staff Settings</h2>
        <p className="text-xs text-[#758078] mt-0.5">
          View your authenticated staff profile, Supabase connection status, editable service priority pricing, and session preferences.
        </p>
      </div>

      {/* Authenticated Supabase Notice */}
      <div className="p-4 bg-[#DCE8DF]/55 border border-[#C3D9C9] rounded-xl flex items-start gap-3 text-xs text-[#123C2A]">
        <Shield className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold">
            Supabase Auth &amp; Row Level Security Active
          </p>
          <p className="text-[#202A24]/85 mt-0.5 leading-relaxed">
            Signed in as <strong>{staffProfile?.fullName ?? settings.adminName}</strong> (
            <span className="font-mono">{staffProfile?.role ?? 'staff'}</span>). All queries run directly through the authenticated Supabase client with Row Level Security enforced.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-[#E6EAE5] rounded-xl overflow-hidden">
        <div className="px-3 sm:px-4 pt-2 border-b border-[#E6EAE5] flex items-center gap-1 overflow-x-auto flex-nowrap">
          {(
            [
              { id: 'profile', label: 'Staff Profile' },
              { id: 'access', label: 'Supabase & Security' },
              { id: 'notifications', label: 'Notifications' },
              { id: 'general', label: 'Pricing & Preferences' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`min-h-[44px] sm:min-h-[38px] px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                tab === item.id
                  ? 'border-[#123C2A] text-[#123C2A]'
                  : 'border-transparent text-[#758078] hover:text-[#202A24]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          {tab === 'profile' && (
            <div className="max-w-xl space-y-5">
              <div className="flex items-center gap-4 pb-4 border-b border-[#E6EAE5]">
                <img
                  src={settings.adminAvatarUrl}
                  alt={staffProfile?.fullName ?? settings.adminName}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-full object-cover border border-[#E6EAE5]"
                />
                <div>
                  <p className="text-sm font-semibold text-[#202A24]">
                    {staffProfile?.fullName ?? settings.adminName}
                  </p>
                  <p className="text-xs text-[#758078]">
                    {staffProfile ? ROLE_LABELS[staffProfile.role] : 'Staff'} · Verified in staff_profiles
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg">
                  <dt className="text-[#758078]">Staff Email</dt>
                  <dd className="font-mono text-[#202A24] mt-1 break-all">
                    {staffProfile?.email || '—'}
                  </dd>
                </div>
                <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg">
                  <dt className="text-[#758078]">Role Slug</dt>
                  <dd className="font-mono font-semibold text-[#123C2A] mt-1">
                    {staffProfile?.role ?? '—'}
                  </dd>
                </div>
                <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg">
                  <dt className="text-[#758078]">Phone</dt>
                  <dd className="font-mono text-[#202A24] mt-1">
                    {staffProfile?.phone || '—'}
                  </dd>
                </div>
                <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg">
                  <dt className="text-[#758078]">Account Status</dt>
                  <dd className="text-[#123C2A] font-semibold mt-1 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {staffProfile?.isActive ? 'Active' : 'Inactive'}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {tab === 'access' && (
            <div className="space-y-6">
              <div className="p-4 bg-[#F7F6F0] border border-[#E6EAE5] rounded-xl text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-[#202A24]">
                  <Database className="w-4 h-4 text-[#123C2A]" />
                  <span>Supabase Project Connection</span>
                </div>
                <p className="text-[#758078] leading-relaxed">
                  Client configuration status:{' '}
                  <strong className="text-[#202A24]">
                    {isConfigured ? 'Configured & Authenticated' : 'Not Configured'}
                  </strong>
                  . Uses <span className="font-mono">VITE_SUPABASE_URL</span> and{' '}
                  <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> only (zero service-role keys in frontend code).
                </p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[#758078] uppercase tracking-wider mb-3">
                  Authorized Staff Roles (<span className="font-mono">staff_profiles</span>)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {[
                    { role: 'super_admin', perms: 'Full operational access across requests, operators, locations, pricing, and staff records.' },
                    { role: 'admin', perms: 'Manage service requests, vehicle operators, assignments, pricing, and service areas.' },
                    { role: 'staff', perms: 'View service requests, contact operators by phone, and manage assignments.' },
                  ].map((item) => (
                    <div key={item.role} className="p-3.5 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg">
                      <p className="font-semibold font-mono text-[#123C2A]">{item.role}</p>
                      <p className="text-[#758078] mt-1 leading-relaxed">{item.perms}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="max-w-xl space-y-4">
              <div className="p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg flex items-start gap-2.5 text-xs text-[#5C665F]">
                <Info className="w-4 h-4 text-[#123C2A] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Notification toggles apply to your current browser session only. No user notification preferences table exists in Supabase yet.
                </p>
              </div>

              {(
                [
                  {
                    key: 'notifyNewRequests',
                    label: 'New customer service requests',
                    desc: 'Highlight pending customer intake in the header notification tray.',
                  },
                  {
                    key: 'notifyEmergencyPriority',
                    label: 'Emergency priority escalation',
                    desc: 'Prioritize Emergency service requests at the top of the notification tray.',
                  },
                  {
                    key: 'notifyOperatorStatusChanges',
                    label: 'Operator availability changes',
                    desc: 'Show toast confirmations whenever staff update operator availability.',
                  },
                ] as const
              ).map((item) => (
                <label
                  key={item.key}
                  className="flex items-start justify-between gap-4 p-3.5 border border-[#E6EAE5] rounded-lg cursor-pointer hover:bg-[#F7F6F0]/50"
                >
                  <div>
                    <p className="text-xs font-semibold text-[#202A24]">{item.label}</p>
                    <p className="text-xs text-[#758078] mt-0.5">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings[item.key]}
                    onChange={(e) => updateSettings({ [item.key]: e.target.checked })}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[#123C2A]"
                  />
                </label>
              ))}
            </div>
          )}

          {tab === 'general' && (
            <div className="space-y-8">
              {/* Editable Service Priority Pricing (Supabase public.service_priorities) */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#202A24]">
                      Service Priority Pricing (<span className="font-mono text-xs">service_priorities</span>)
                    </h3>
                    <p className="text-xs text-[#758078] mt-0.5">
                      Changes save directly to Supabase and update customer registration options immediately. Existing service requests keep their saved price snapshots.
                    </p>
                  </div>
                </div>

                {savedNotice && (
                  <div
                    role="status"
                    className="p-3.5 bg-[#DCE8DF]/65 border border-[#C3D9C9] rounded-xl flex items-center gap-2.5 text-xs text-[#123C2A]"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{savedNotice}</span>
                  </div>
                )}

                {priorities.length === 0 ? (
                  <div className="p-5 text-xs text-[#758078] bg-[#F7F6F0] border border-[#E6EAE5] rounded-xl">
                    No priority tiers loaded from <span className="font-mono">service_priorities</span> yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {priorities.map((p) => (
                      <article
                        key={p.id}
                        className={`rounded-xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-colors ${
                          p.active
                            ? 'bg-white border-[#E6EAE5]'
                            : 'bg-[#F7F6F0]/70 border-[#E6EAE5] opacity-85'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F7F6F0] border border-[#E6EAE5] text-[#5C665F]">
                                  #{p.displayOrder}
                                </span>
                                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#F7F6F0] border border-[#E6EAE5] text-[#5C665F]">
                                  {p.code}
                                </span>
                              </div>
                              <h4 className="text-base font-semibold text-[#202A24] mt-2 break-words">
                                {p.nameEn}
                              </h4>
                              {p.nameAm && (
                                <p className="text-xs text-[#758078] mt-0.5 break-words">
                                  {p.nameAm}
                                </p>
                              )}
                            </div>

                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 border ${
                                p.active
                                  ? 'bg-[#DCE8DF] text-[#123C2A] border-[#C3D9C9]'
                                  : 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]'
                              }`}
                            >
                              {p.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>

                          <div className="pt-3 border-t border-[#E6EAE5] space-y-2">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-xs text-[#758078]">Service Price</span>
                              <span className="text-lg font-mono font-bold tabular-nums text-[#123C2A]">
                                {formatETB(p.priceEtb)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-[#758078] inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                Timeframe
                              </span>
                              <span className="font-medium text-[#202A24] text-right">
                                {formatTimeframeLabel(p.minHours, p.maxHours)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSavedNotice(null);
                            setEditingPriority(p);
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs font-semibold text-[#123C2A] bg-[#F7F6F0] border border-[#123C2A]/25 rounded-lg hover:bg-[#DCE8DF] transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Pricing &amp; Details</span>
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <hr className="border-[#E6EAE5]" />

              {/* Session-Only Dispatch Preferences */}
              <section className="max-w-xl space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#202A24]">
                    Session Preferences (Browser Session Only)
                  </h3>
                  <div className="mt-2 p-3 bg-[#FEF3C7]/60 border border-[#FDE68A] rounded-lg flex items-start gap-2.5 text-xs text-[#78350F]">
                    <Info className="w-4 h-4 text-[#92400E] shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Not saved to Supabase:</strong> The current Supabase database does not include a global <span className="font-mono">settings</span> or <span className="font-mono">preferences</span> table yet. Changes below apply to your active browser session only.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveGeneral} className="space-y-4">
                  <div>
                    <label
                      htmlFor="pref-language"
                      className="block text-xs font-medium text-[#202A24] mb-1"
                    >
                      Interface Language Preference (Session Only)
                    </label>
                    <select
                      id="pref-language"
                      value={settings.language}
                      onChange={(e) =>
                        updateSettings({ language: e.target.value as 'en' | 'am-en' })
                      }
                      className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm border border-[#E6EAE5] rounded-lg bg-white focus:outline-none focus:border-[#123C2A]"
                    >
                      <option value="en">English (with Amharic location labels)</option>
                      <option value="am-en">Bilingual Amharic / English (አማርኛ + English)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="pref-operating-hours"
                      className="block text-xs font-medium text-[#202A24] mb-1"
                    >
                      Dispatch Operating Hours (Session Only)
                    </label>
                    <input
                      id="pref-operating-hours"
                      type="text"
                      value={operatingHours}
                      onChange={(e) => setOperatingHours(e.target.value)}
                      className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="pref-dispatch-line"
                      className="block text-xs font-medium text-[#202A24] mb-1"
                    >
                      Primary Dispatch Phone Line (Session Only)
                    </label>
                    <input
                      id="pref-dispatch-line"
                      type="tel"
                      value={dispatchLine}
                      onChange={(e) => setDispatchLine(e.target.value)}
                      className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm font-mono border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto min-h-[44px] sm:min-h-[38px] px-4 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg hover:bg-[#0E2F21]"
                  >
                    Apply Session Preferences
                  </button>
                </form>
              </section>
            </div>
          )}
        </div>
      </div>

      <EditPriorityModal
        priority={editingPriority}
        open={Boolean(editingPriority)}
        onClose={() => setEditingPriority(null)}
        onSaved={(name, price) => {
          setSavedNotice(
            `Saved "${name}" at ${formatETB(price)} to public.service_priorities.`
          );
        }}
      />
    </div>
  );
}
