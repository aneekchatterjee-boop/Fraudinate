import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'System Telemetry Disrupted',
  message,
  onRetry
}) => {
  return (
    <div
      id="error-state-container"
      className="flex flex-col items-center justify-center p-8 text-center bg-rose-950/20 rounded-xl border border-rose-900/40"
    >
      <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
        <AlertOctagon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-rose-200 mb-1">{title}</h3>
      <p className="text-xs font-mono text-rose-300/80 max-w-md mb-4 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <button
          id="btn-retry-error-state"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-mono text-rose-200 border border-rose-500/30 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      )}
    </div>
  );
};
