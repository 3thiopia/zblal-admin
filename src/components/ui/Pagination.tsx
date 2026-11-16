import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#E6EAE5] text-xs text-[#758078]">
      <div className="tabular-nums text-center sm:text-left">
        Showing <span className="font-medium text-[#202A24]">{start}</span> to{' '}
        <span className="font-medium text-[#202A24]">{end}</span> of{' '}
        <span className="font-medium text-[#202A24]">{totalItems}</span> records
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center justify-center gap-1 px-3 py-2 sm:px-2.5 sm:py-1.5 min-h-[44px] sm:min-h-[34px] rounded-lg border border-[#E6EAE5] bg-white text-[#202A24] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F7F6F0] transition-colors whitespace-nowrap shrink-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Previous
        </button>
        <span className="px-2.5 py-1.5 font-mono tabular-nums text-[#202A24]">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center justify-center gap-1 px-3 py-2 sm:px-2.5 sm:py-1.5 min-h-[44px] sm:min-h-[34px] rounded-lg border border-[#E6EAE5] bg-white text-[#202A24] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F7F6F0] transition-colors whitespace-nowrap shrink-0"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
