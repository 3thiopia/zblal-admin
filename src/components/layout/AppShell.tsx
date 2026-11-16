import React from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../ui/ToastContainer';
import { RegisterOperatorModal } from '../operators/RegisterOperatorModal';
import { useApp } from '../../context/AppContext';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { registerModalOpen, setRegisterModalOpen, loadingData, dataError, refreshData } = useApp();

  return (
    <div className="min-h-dvh flex bg-[#F7F6F0] text-[#202A24] overflow-x-clip">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header />
        <main className="flex-1 px-3.5 pt-4 sm:px-6 sm:pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-w-[1440px] w-full mx-auto space-y-4 sm:space-y-5">
          {loadingData && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E6EAE5] rounded-lg text-xs text-[#202A24]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#123C2A] shrink-0" />
              <span>Loading live records from Supabase...</span>
            </div>
          )}

          {dataError && (
            <div
              role="alert"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-[#FEE2E2] border border-[#FECACA] rounded-xl text-xs text-[#991B1B]"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold">Unable to load Supabase records</p>
                  <p className="mt-0.5 leading-relaxed break-words">{dataError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void refreshData()}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-0 text-xs font-medium text-[#991B1B] bg-white border border-[#FECACA] rounded-lg hover:bg-[#FEE2E2]/40 shrink-0 w-full sm:w-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          )}

          {children}
        </main>
      </div>
      <RegisterOperatorModal
        open={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
      />
      <ToastContainer />
    </div>
  );
}
