import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white border border-[#E6EAE5] rounded-xl">
      <div className="w-11 h-11 rounded-xl bg-[#F7F6F0] border border-[#E6EAE5] flex items-center justify-center text-[#758078] mb-3">
        <Inbox className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-[#202A24]">{title}</h3>
      <p className="text-xs text-[#758078] max-w-sm mt-1 leading-relaxed">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
