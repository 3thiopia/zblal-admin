import { LayoutGrid, Table2 } from 'lucide-react';
import type { ViewMode } from '../../hooks/useResponsiveViewMode';

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

export function ViewModeToggle({ value, onChange, className = '' }: ViewModeToggleProps) {
  return (
    <div
      className={`inline-flex items-center border border-[#E6EAE5] rounded-lg p-0.5 bg-[#F7F6F0] shrink-0 ${className}`}
      role="group"
      aria-label="View mode"
    >
      <button
        type="button"
        onClick={() => onChange('cards')}
        aria-pressed={value === 'cards'}
        className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[40px] sm:min-h-[32px] text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
          value === 'cards'
            ? 'bg-white text-[#123C2A] shadow-xs'
            : 'text-[#758078] hover:text-[#202A24]'
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
        <span>Cards</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        aria-pressed={value === 'table'}
        className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[40px] sm:min-h-[32px] text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
          value === 'table'
            ? 'bg-white text-[#123C2A] shadow-xs'
            : 'text-[#758078] hover:text-[#202A24]'
        }`}
      >
        <Table2 className="w-3.5 h-3.5 shrink-0" />
        <span>Table</span>
      </button>
    </div>
  );
}
