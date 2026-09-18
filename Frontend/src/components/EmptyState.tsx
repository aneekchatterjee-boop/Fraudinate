import React from 'react';
import { ShieldCheck, SearchX, LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'No suspicious activities or transactions match the active criteria.',
  icon: Icon = SearchX,
  actionText,
  onAction
}) => {
  return (
    <div
      id="empty-state-container"
      className="flex flex-col items-center justify-center p-12 text-center bg-[#090d16]/40 rounded-xl border border-dashed border-slate-800"
    >
      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-xs font-mono text-slate-400 max-w-sm mb-4 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          id="btn-empty-state-action"
          onClick={onAction}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 border border-slate-700 transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
