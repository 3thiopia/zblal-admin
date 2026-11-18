import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Truck,
  Users,
  MapPin,
  Map as MapIcon,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  X,
  Gamepad2,
  Trophy,
  CalendarDays,
  Award,
  Sliders,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog } from '../ui/ConfirmDialog';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/requests', label: 'Service Requests', icon: ClipboardList },
  { to: '/operators', label: 'Vehicle Operators', icon: Truck },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/locations', label: 'Locations', icon: MapPin },
  { to: '/map', label: 'Map', icon: MapIcon },
  { to: '/finance', label: 'Finance', icon: Wallet },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const ARCADE_NAV_ITEMS = [
  { to: '/arcade', label: 'Arcade Overview', icon: Gamepad2, end: true },
  { to: '/arcade/players', label: 'Arcade Players', icon: Users },
  { to: '/arcade/leaderboards', label: 'Leaderboards', icon: Trophy },
  { to: '/arcade/competitions', label: 'Competitions', icon: CalendarDays },
  { to: '/arcade/winners', label: 'Winners & Rewards', icon: Award },
  { to: '/arcade/games', label: 'Arcade Games', icon: Sliders },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
};

export function Sidebar() {
  const { sidebarCollapsed, mobileNavOpen, setMobileNavOpen, settings } = useApp();
  const { staffProfile, signOut } = useAuth();
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [mobileNavOpen, setMobileNavOpen]);

  const displayName = staffProfile?.fullName || settings.adminName;
  const roleLabel = staffProfile ? ROLE_LABELS[staffProfile.role] ?? staffProfile.role : 'Staff';

  const handleSignOutConfirm = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const renderBrand = (collapsed: boolean) => (
    <div className={`flex items-center gap-3 px-4 h-16 border-b border-[#E6EAE5] ${collapsed ? 'justify-center px-2' : ''}`}>
      <div className="w-9 h-9 rounded-lg bg-[#123C2A] text-white flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 15h11a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H4" strokeLinecap="round" />
          <path d="M4 5v14" strokeLinecap="round" />
          <circle cx="8" cy="18" r="2" />
          <circle cx="16" cy="18" r="2" />
          <path d="M18 10h2.5l1.5 2.5V16h-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-[#123C2A] tracking-tight whitespace-nowrap">
              Zblal
            </span>
            <span className="text-xs font-medium text-[#758078] whitespace-nowrap">
              ዝብላል
            </span>
          </div>
          <p className="text-[11px] font-medium text-[#758078] whitespace-nowrap truncate">
            Operations Panel
          </p>
        </div>
      )}
    </div>
  );

  const renderNav = (collapsed: boolean, onNavigate?: () => void) => (
    <nav className="flex-1 px-3 py-3 sm:py-4 space-y-1 overflow-y-auto overscroll-contain" aria-label="Primary Navigation">
      {!collapsed && (
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#758078]">
          Operations
        </p>
      )}
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 min-h-[44px] lg:min-h-[40px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                collapsed ? 'justify-center px-2' : ''
              } ${
                isActive
                  ? 'bg-[#123C2A] text-white'
                  : 'text-[#202A24] hover:bg-[#F7F6F0] hover:text-[#123C2A]'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        );
      })}

      <div className="pt-3 mt-3 border-t border-[#E6EAE5] space-y-1">
        {!collapsed && (
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#758078]">
            Arcade Management
          </p>
        )}
        {ARCADE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 min-h-[44px] lg:min-h-[40px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  collapsed ? 'justify-center px-2' : ''
                } ${
                  isActive
                    ? 'bg-[#123C2A] text-white'
                    : 'text-[#202A24] hover:bg-[#F7F6F0] hover:text-[#123C2A]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );

  const renderProfileFooter = (collapsed: boolean, onNavigate?: () => void) => (
    <div className="p-3 border-t border-[#E6EAE5] space-y-1.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:pb-3">
      <button
        type="button"
        onClick={() => {
          navigate('/settings');
          onNavigate?.();
        }}
        className={`w-full flex items-center gap-2.5 p-2 min-h-[44px] rounded-lg hover:bg-[#F7F6F0] transition-colors text-left ${
          collapsed ? 'justify-center' : ''
        }`}
        title={collapsed ? displayName : undefined}
      >
        <img
          src={settings.adminAvatarUrl}
          alt={displayName}
          referrerPolicy="no-referrer"
          className="w-8 h-8 rounded-full object-cover border border-[#E6EAE5] shrink-0"
        />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#202A24] truncate">{displayName}</p>
            <p className="text-[11px] text-[#758078] truncate">{roleLabel}</p>
          </div>
        )}
      </button>
      <button
        type="button"
        onClick={() => setSignOutDialogOpen(true)}
        title={collapsed ? 'Sign out' : undefined}
        className={`w-full flex items-center gap-2.5 px-3 py-2 min-h-[44px] lg:min-h-[38px] rounded-lg text-xs font-medium text-[#758078] hover:text-[#991B1B] hover:bg-[#FEE2E2]/40 transition-colors whitespace-nowrap ${
          collapsed ? 'justify-center px-2' : ''
        }`}
      >
        <LogOut className="w-4 h-4 shrink-0" />
        {!collapsed && <span>Sign Out</span>}
      </button>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-[#E6EAE5] shrink-0 transition-[width] duration-200 ${
          sidebarCollapsed ? 'w-[76px]' : 'w-[252px]'
        }`}
      >
        {renderBrand(sidebarCollapsed)}
        {renderNav(sidebarCollapsed)}
        {renderProfileFooter(sidebarCollapsed)}
      </aside>

      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
        >
          <div
            className="fixed inset-0 bg-[#202A24]/45"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white h-dvh border-r border-[#E6EAE5] flex flex-col z-10 shadow-xl">
            <div className="flex items-center justify-between pr-2 border-b border-[#E6EAE5]">
              <div className="flex-1 min-w-0 [&>div]:border-b-0">{renderBrand(false)}</div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation menu"
                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg text-[#758078] hover:text-[#202A24] hover:bg-[#F7F6F0] shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNav(false, () => setMobileNavOpen(false))}
            {renderProfileFooter(false, () => setMobileNavOpen(false))}
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={signOutDialogOpen}
        onClose={() => setSignOutDialogOpen(false)}
        onConfirm={handleSignOutConfirm}
        title="Sign out of Zblal Admin?"
        description="Your active staff session will be signed out and you will be returned to the sign-in screen."
        confirmLabel="Sign Out"
        tone="danger"
      />
    </>
  );
}
