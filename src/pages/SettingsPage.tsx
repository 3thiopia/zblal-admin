import React, { useState } from 'react';
import { Shield, Database, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatETB } from '../utils/formatters';

type SettingsTab = 'profile' | 'access' | 'notifications' | 'general';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
};

export function SettingsPage() {
  const { settings, updateSettings, priorities } = useApp();
  const { staffProfile, isConfigured } = useAuth();

  const [tab, setTab] = useState<SettingsTab>('profile');

  // General dispatch preferences form
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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#202A24]">System & Staff Settings</h2>
        <p className="text-xs text-[#758078] mt-0.5">
          View your authenticated staff profile, Supabase connection status, service priority rates, and dispatch preferences.
        </p>
      </div>

      {/* Authenticated Supabase Notice */}
      <div className="p-4 bg-[#DCE8DF]/55 border border-[#C3D9C9] rounded-xl flex items-start gap-3 text-xs text-[#123C2A]">
        <Shield className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">
            Supabase Auth & Row Level Security Active
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
                  <dd className="font-mono text-[#202A24] mt-1">
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
                    { role: 'super_admin', perms: 'Full operational access across requests, operators, locations, and staff records.' },
                    { role: 'admin', perms: 'Manage service requests, vehicle operators, assignments, and service areas.' },
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
            <div className="space-y-6 max-w-xl">
              <div>
                <h4 className="text-xs font-semibold text-[#758078] uppercase tracking-wider mb-3">
                  Service Priority Pricing (from <span className="font-mono">service_priorities</span>)
                </h4>
                {priorities.length === 0 ? (
                  <p className="text-xs text-[#758078] p-3 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg">
                    No priority tiers loaded from <span className="font-mono">service_priorities</span> yet.
                  </p>
                ) : (
                  <div className="divide-y divide-[#E6EAE5] border border-[#E6EAE5] rounded-lg overflow-hidden text-xs">
                    {priorities.map((p) => (
                      <div key={p.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 bg-white">
                        <div>
                          <span className="font-semibold text-[#202A24]">{p.name}</span>
                          <span className="ml-2 font-mono text-[11px] text-[#758078]">({p.code})</span>
                        </div>
                        <span className="font-mono font-semibold text-[#123C2A]">
                          {formatETB(p.priceEtb)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleSaveGeneral} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#202A24] mb-1">
                    Interface Language Preference
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => updateSettings({ language: e.target.value as 'en' | 'am-en' })}
                    className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm border border-[#E6EAE5] rounded-lg bg-white focus:outline-none focus:border-[#123C2A]"
                  >
                    <option value="en">English (with Amharic location labels)</option>
                    <option value="am-en">Bilingual Amharic / English (አማርኛ + English)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#202A24] mb-1">
                    Dispatch Operating Hours
                  </label>
                  <input
                    type="text"
                    value={operatingHours}
                    onChange={(e) => setOperatingHours(e.target.value)}
                    className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#202A24] mb-1">
                    Primary Dispatch Phone Line
                  </label>
                  <input
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
                  Save Preferences
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
