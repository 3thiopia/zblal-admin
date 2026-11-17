import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Bell,
  ChevronRight,
  UserCheck,
  Settings as SettingsIcon,
  CheckCheck,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatTimeAgo } from '../../utils/formatters';

interface BreadcrumbItem {
  label: string;
  to?: string;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  staff: 'Staff',
};

export function Header() {
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    setMobileNavOpen,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    settings,
    operators,
    requests,
    customers,
    loadingData,
    refreshData,
  } = useApp();
  const { staffProfile, signOut } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(e.target as Node)) {
        setMobileSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayName = staffProfile?.fullName || settings.adminName;
  const roleLabel = staffProfile ? ROLE_LABELS[staffProfile.role] ?? staffProfile.role : 'Staff';

  const { title, breadcrumbs } = useMemo((): {
    title: string;
    breadcrumbs: BreadcrumbItem[];
  } => {
    const path = location.pathname;
    if (path === '/') {
      return { title: 'Dashboard', breadcrumbs: [{ label: 'Operations' }, { label: 'Dashboard' }] };
    }
    if (path === '/requests') {
      return {
        title: 'Service Requests',
        breadcrumbs: [{ label: 'Operations', to: '/' }, { label: 'Service Requests' }],
      };
    }
    if (path.startsWith('/requests/')) {
      const id = path.replace('/requests/', '');
      const req = requests.find((r) => r.id === id);
      return {
        title: req ? req.referenceNumber : 'Request Details',
        breadcrumbs: [
          { label: 'Operations', to: '/' },
          { label: 'Service Requests', to: '/requests' },
          { label: req ? req.referenceNumber : 'Details' },
        ],
      };
    }
    if (path === '/operators') {
      return {
        title: 'Vehicle Operators',
        breadcrumbs: [{ label: 'Operations', to: '/' }, { label: 'Vehicle Operators' }],
      };
    }
    if (path.startsWith('/operators/')) {
      const id = path.replace('/operators/', '');
      const op = operators.find((o) => o.id === id);
      return {
        title: op ? op.fullName : 'Operator Profile',
        breadcrumbs: [
          { label: 'Operations', to: '/' },
          { label: 'Vehicle Operators', to: '/operators' },
          { label: op ? op.fullName : 'Profile' },
        ],
      };
    }
    if (path === '/customers') {
      return {
        title: 'Customers',
        breadcrumbs: [{ label: 'Operations', to: '/' }, { label: 'Customers' }],
      };
    }
    if (path.startsWith('/customers/')) {
      const id = path.replace('/customers/', '');
      const cust = customers.find((c) => c.id === id);
      return {
        title: cust ? cust.fullName : 'Customer Profile',
        breadcrumbs: [
          { label: 'Operations', to: '/' },
          { label: 'Customers', to: '/customers' },
          { label: cust ? cust.fullName : 'Profile' },
        ],
      };
    }
    if (path === '/locations') {
      return {
        title: 'Locations',
        breadcrumbs: [{ label: 'Operations', to: '/' }, { label: 'Locations' }],
      };
    }
    if (path === '/map') {
      return {
        title: 'Map',
        breadcrumbs: [{ label: 'Operations', to: '/' }, { label: 'Map' }],
      };
    }
    if (path === '/finance') {
      return {
        title: 'Finance',
        breadcrumbs: [{ label: 'Operations', to: '/' }, { label: 'Finance' }],
      };
    }
    if (path === '/reports') {
      return {
        title: 'Reports',
        breadcrumbs: [{ label: 'Operations', to: '/' }, { label: 'Reports' }],
      };
    }
    if (path === '/settings') {
      return {
        title: 'Settings',
        breadcrumbs: [{ label: 'Operations', to: '/' }, { label: 'Settings' }],
      };
    }
    return { title: 'Zblal Operations', breadcrumbs: [{ label: 'Operations' }] };
  }, [location.pathname, requests, operators, customers]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const matchedRequests = requests
      .filter(
        (r) =>
          r.referenceNumber.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.customerPhone.toLowerCase().includes(q)
      )
      .slice(0, 3)
      .map((r) => ({
        id: r.id,
        label: r.referenceNumber,
        sublabel: `${r.customerName} · ${r.subcityName}`,
        to: `/requests/${r.id}`,
        kind: 'Request',
      }));

    const matchedOperators = operators
      .filter(
        (o) =>
          o.fullName.toLowerCase().includes(q) ||
          o.vehiclePlate.toLowerCase().includes(q) ||
          o.phone_e164.toLowerCase().includes(q)
      )
      .slice(0, 3)
      .map((o) => ({
        id: o.id,
        label: o.fullName,
        sublabel: `${o.vehiclePlate} · ${o.subcityName}`,
        to: `/operators/${o.id}`,
        kind: 'Operator',
      }));

    return [...matchedRequests, ...matchedOperators];
  }, [searchQuery, requests, operators]);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E6EAE5]">
      <div className="h-16 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation menu"
            className="lg:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] -ml-1.5 rounded-lg text-[#202A24] hover:bg-[#F7F6F0] active:bg-[#DCE8DF]/40 transition-colors shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link
            to="/"
            aria-label="Zblal Dashboard"
            className="lg:hidden w-8 h-8 rounded-lg bg-[#123C2A] text-white flex items-center justify-center shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 15h11a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H4" strokeLinecap="round" />
              <path d="M4 5v14" strokeLinecap="round" />
              <circle cx="8" cy="18" r="2" />
              <circle cx="16" cy="18" r="2" />
              <path d="M18 10h2.5l1.5 2.5V16h-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:inline-flex p-2 -ml-2 rounded-lg text-[#758078] hover:text-[#202A24] hover:bg-[#F7F6F0] transition-colors shrink-0"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <span className="block sm:hidden text-[10px] font-semibold uppercase tracking-wider text-[#123C2A] leading-none mb-0.5 truncate">
              Zblal · ዝብላል
            </span>
            <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1 text-[11px] text-[#758078]">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.label + idx}>
                  {idx > 0 && <ChevronRight className="w-3 h-3 text-[#758078]/70 shrink-0" />}
                  {crumb.to ? (
                    <Link to={crumb.to} className="hover:text-[#123C2A] transition-colors truncate">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-[#758078] truncate">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
            <h1 className="text-sm sm:text-lg font-semibold text-[#202A24] truncate leading-tight">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          <div ref={searchRef} className="relative hidden md:block w-56 lg:w-64">
            <Search className="w-4 h-4 text-[#758078] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              placeholder="Jump to ref, operator, plate..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg text-[#202A24] placeholder:text-[#758078] focus:outline-none focus:bg-white focus:border-[#123C2A]"
            />
            {searchOpen && searchQuery.trim() && (
              <div className="absolute right-0 mt-1.5 w-80 bg-white border border-[#E6EAE5] rounded-xl shadow-lg overflow-hidden z-40">
                {searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-[#758078]">
                    No requests or operators match “{searchQuery}”.
                  </div>
                ) : (
                  <ul className="divide-y divide-[#E6EAE5]">
                    {searchResults.map((res) => (
                      <li key={`${res.kind}-${res.id}`}>
                        <button
                          type="button"
                          onClick={() => {
                            navigate(res.to);
                            setSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-[#F7F6F0] flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#202A24] truncate">{res.label}</p>
                            <p className="text-[11px] text-[#758078] truncate">{res.sublabel}</p>
                          </div>
                          <span className="text-[11px] font-medium text-[#123C2A] shrink-0">
                            {res.kind}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setMobileSearchOpen((prev) => !prev);
              setNotifOpen(false);
              setProfileOpen(false);
            }}
            aria-label="Search requests or operators"
            aria-expanded={mobileSearchOpen}
            className={`md:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg border transition-colors ${
              mobileSearchOpen
                ? 'bg-[#DCE8DF]/60 border-[#123C2A]/20 text-[#123C2A]'
                : 'border-transparent text-[#202A24] hover:bg-[#F7F6F0]'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => void refreshData()}
            disabled={loadingData}
            title="Refresh data from Supabase"
            aria-label="Refresh data"
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 rounded-lg text-[#202A24] hover:bg-[#F7F6F0] border border-transparent hover:border-[#E6EAE5] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin text-[#123C2A]' : ''}`} />
          </button>

          <div ref={notifRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifOpen((o) => !o);
                setMobileSearchOpen(false);
                setProfileOpen(false);
              }}
              aria-label="Notifications"
              className="relative inline-flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 rounded-lg text-[#202A24] hover:bg-[#F7F6F0] border border-transparent hover:border-[#E6EAE5] transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 sm:-top-0.5 sm:-right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#123C2A] text-white text-[10px] font-mono font-semibold flex items-center justify-center tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-[68px] sm:top-auto sm:mt-2 sm:w-96 bg-white border border-[#E6EAE5] rounded-xl shadow-lg overflow-hidden z-40">
                <div className="px-4 py-3 border-b border-[#E6EAE5] flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#202A24]">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="inline-flex items-center gap-1 py-1 px-2 text-[11px] font-medium text-[#123C2A] hover:underline"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-[65dvh] sm:max-h-80 overflow-y-auto divide-y divide-[#E6EAE5]">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-[#758078]">
                      No pending request notifications.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          markNotificationRead(item.id);
                          setNotifOpen(false);
                          if (item.linkTo) navigate(item.linkTo);
                        }}
                        className={`w-full text-left px-4 py-3 min-h-[44px] hover:bg-[#F7F6F0] transition-colors ${
                          !item.read ? 'bg-[#DCE8DF]/30' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-[#202A24]">{item.title}</p>
                          <span className="text-[11px] text-[#758078] tabular-nums shrink-0">
                            {formatTimeAgo(item.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-[#758078] mt-0.5 leading-snug">{item.message}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((o) => !o);
                setMobileSearchOpen(false);
                setNotifOpen(false);
              }}
              aria-label="Account menu"
              className="flex items-center justify-center gap-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-1.5 sm:pl-1.5 sm:pr-2.5 sm:py-1 rounded-lg border border-[#E6EAE5] hover:bg-[#F7F6F0] transition-colors"
            >
              <img
                src={settings.adminAvatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover"
              />
              <span className="hidden sm:inline text-xs font-medium text-[#202A24] max-w-[120px] truncate">
                {displayName}
              </span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-60 max-w-[calc(100vw-1.5rem)] bg-white border border-[#E6EAE5] rounded-xl shadow-lg overflow-hidden z-40">
                <div className="px-4 py-3 border-b border-[#E6EAE5]">
                  <p className="text-xs font-semibold text-[#202A24] truncate">{displayName}</p>
                  <p className="text-[11px] text-[#758078] truncate">
                    {roleLabel} {staffProfile?.email ? `· ${staffProfile.email}` : ''}
                  </p>
                </div>
                <div className="p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 text-xs font-medium text-[#202A24] hover:bg-[#F7F6F0] rounded-lg"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#758078]" />
                    Staff Profile & Role
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 text-xs font-medium text-[#202A24] hover:bg-[#F7F6F0] rounded-lg"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-[#758078]" />
                    System Settings
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setProfileOpen(false);
                      await signOut();
                      navigate('/login', { replace: true });
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 text-xs font-medium text-[#991B1B] hover:bg-[#FEE2E2]/50 rounded-lg mt-0.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileSearchOpen && (
        <div
          ref={mobileSearchRef}
          className="md:hidden px-3 pb-3 pt-1 border-t border-[#E6EAE5] bg-white space-y-2"
        >
          <div className="relative">
            <Search className="w-4 h-4 text-[#758078] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Jump to ref, operator, plate..."
              className="w-full min-h-[44px] pl-9 pr-3 py-2 text-sm bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg text-[#202A24] placeholder:text-[#758078] focus:outline-none focus:bg-white focus:border-[#123C2A]"
            />
          </div>
          {searchQuery.trim() && (
            <div className="border border-[#E6EAE5] rounded-xl overflow-hidden bg-white max-h-64 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="px-4 py-3 text-xs text-[#758078]">
                  No requests or operators match “{searchQuery}”.
                </div>
              ) : (
                <ul className="divide-y divide-[#E6EAE5]">
                  {searchResults.map((res) => (
                    <li key={`mobile-${res.kind}-${res.id}`}>
                      <button
                        type="button"
                        onClick={() => {
                          navigate(res.to);
                          setMobileSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full px-4 py-3 min-h-[44px] text-left hover:bg-[#F7F6F0] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#202A24] truncate">{res.label}</p>
                          <p className="text-[11px] text-[#758078] truncate">{res.sublabel}</p>
                        </div>
                        <span className="text-[11px] font-medium text-[#123C2A] shrink-0">
                          {res.kind}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
