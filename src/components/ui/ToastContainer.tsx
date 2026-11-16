import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function ToastContainer() {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 z-50 flex flex-col gap-2 sm:w-96 pointer-events-none">
      {toasts.map((toast) => {
        const Icon =
          toast.variant === 'error' || toast.variant === 'warning'
            ? AlertCircle
            : toast.variant === 'info'
            ? Info
            : CheckCircle2;
        const iconColor =
          toast.variant === 'error'
            ? 'text-[#991B1B]'
            : toast.variant === 'warning'
            ? 'text-[#B45309]'
            : toast.variant === 'info'
            ? 'text-[#1D4ED8]'
            : 'text-[#123C2A]';
        const borderClass =
          toast.variant === 'error'
            ? 'border-[#FECACA] bg-[#FEF2F2]'
            : 'border-[#E6EAE5] bg-white';

        return (
          <div
            key={toast.id}
            role={toast.variant === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 border rounded-xl shadow-md ${borderClass}`}
          >
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#202A24]">{toast.title}</p>
              {toast.description && (
                <p className="text-xs text-[#758078] mt-0.5 leading-snug">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 text-[#758078] hover:text-[#202A24] rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
