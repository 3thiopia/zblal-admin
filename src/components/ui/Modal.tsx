import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const SIZE_CLASSES = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'lg',
  children,
  footer,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#202A24]/45 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        className={`w-full ${SIZE_CLASSES[size]} bg-white border border-[#E6EAE5] rounded-t-2xl sm:rounded-xl shadow-lg max-h-[94dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-[#E6EAE5] shrink-0">
          <div className="min-w-0">
            <h2 id="modal-title" className="text-base font-semibold text-[#202A24] leading-snug">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-[#758078] mt-0.5 leading-snug">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 -mr-2 -my-1 rounded-lg text-[#758078] hover:text-[#202A24] hover:bg-[#F7F6F0] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div
          className={`px-4 py-4 sm:p-5 overflow-y-auto flex-1 overscroll-contain ${
            footer ? '' : 'pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5'
          }`}
        >
          {children}
        </div>
        {footer && (
          <div className="px-4 sm:px-5 pt-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))] sm:py-3.5 bg-[#F7F6F0]/60 border-t border-[#E6EAE5] flex flex-col-reverse sm:flex-row sm:flex-wrap sm:items-center sm:justify-end gap-2.5 shrink-0 [&>button]:w-full sm:[&>button]:w-auto [&>button]:min-h-[44px] sm:[&>button]:min-h-[38px] [&>button]:justify-center">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
