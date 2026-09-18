import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subtext?: string;
  height?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Analyzing real-time transaction telemetry...',
  subtext = 'Connecting to firewall pipeline',
  height = 'h-64'
}) => {
  return (
    <div
      id="loading-state-container"
      className={`flex flex-col items-center justify-center ${height} p-8 text-center bg-[#090d16]/50 rounded-xl border border-slate-800/80`}
    >
      <div className="relative mb-4">
        <div className="w-10 h-10 rounded-full border-2 border-slate-800 border-t-emerald-400 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>
      <p className="text-sm font-mono text-slate-200 font-medium tracking-wide mb-1">
        {message}
      </p>
      <p className="text-xs font-mono text-slate-500">{subtext}</p>
    </div>
  );
};
