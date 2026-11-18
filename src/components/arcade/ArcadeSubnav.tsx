import { NavLink } from 'react-router-dom';
import {
  Gamepad2,
  Trophy,
  Users,
  CalendarDays,
  Award,
  Sliders,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useArcade } from '../../context/ArcadeContext';

const ARCADE_TABS = [
  { to: '/arcade', label: 'Overview', icon: Gamepad2, end: true },
  { to: '/arcade/players', label: 'Players', icon: Users },
  { to: '/arcade/leaderboards', label: 'Leaderboards', icon: Trophy },
  { to: '/arcade/competitions', label: 'Competitions', icon: CalendarDays },
  { to: '/arcade/winners', label: 'Winners & Rewards', icon: Award },
  { to: '/arcade/games', label: 'Games', icon: Sliders },
];

export function ArcadeSubnav() {
  const { loadingArcade, arcadeError, refreshArcadeData } = useArcade();

  return (
    <div className="space-y-3">
      <div className="bg-white border border-[#E6EAE5] rounded-xl px-2 sm:px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto">
        <nav className="flex items-center gap-1 flex-nowrap min-w-0" aria-label="Arcade Management Sections">
          {ARCADE_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] sm:min-h-[34px] rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#123C2A] text-white'
                      : 'text-[#5C665F] hover:text-[#123C2A] hover:bg-[#F7F6F0]'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => void refreshArcadeData()}
          disabled={loadingArcade}
          aria-label="Refresh Arcade data"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] text-xs font-medium text-[#123C2A] bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg hover:bg-[#DCE8DF]/60 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingArcade ? 'animate-spin' : ''}`} />
          <span>Sync</span>
        </button>
      </div>

      {loadingArcade && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E6EAE5] rounded-lg text-xs text-[#202A24]">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#123C2A] shrink-0" />
          <span>Syncing live Arcade records from Supabase...</span>
        </div>
      )}

      {arcadeError && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-[#FEE2E2] border border-[#FECACA] rounded-xl text-xs text-[#991B1B]"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold">Unable to load Arcade records</p>
              <p className="mt-0.5 leading-relaxed break-words">{arcadeError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refreshArcadeData()}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 text-xs font-medium text-[#991B1B] bg-white border border-[#FECACA] rounded-lg hover:bg-[#FEE2E2]/40 shrink-0 w-full sm:w-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
