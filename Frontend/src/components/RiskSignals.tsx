import React from 'react';
import { AlertTriangle, Zap, Network, UserPlus, Clock, ArrowRightLeft, DollarSign, Layers } from 'lucide-react';

interface RiskSignalsProps {
  signals: string[];
  size?: 'sm' | 'md';
  variant?: 'badges' | 'list';
}

export const RiskSignals: React.FC<RiskSignalsProps> = ({
  signals,
  size = 'md',
  variant = 'badges'
}) => {
  if (!signals || signals.length === 0) {
    return <span className="text-slate-500 text-xs italic">No anomaly signals triggered</span>;
  }

  const getSignalMetadata = (signal: string) => {
    const s = signal.toUpperCase();
    if (s.includes('HIGH TRANSACTION VALUE') || s.includes('ELEVATED VALUE')) {
      return { icon: DollarSign, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', category: 'Volume' };
    }
    if (s.includes('VELOCITY')) {
      return { icon: Zap, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', category: 'Temporal' };
    }
    if (s.includes('NEW ACCOUNT') || s.includes('ACCOUNT AGE')) {
      return { icon: UserPlus, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', category: 'Entity' };
    }
    if (s.includes('MULE') || s.includes('FAN-OUT') || s.includes('NETWORK RISK') || s.includes('CLUSTER')) {
      return { icon: Network, color: 'text-rose-400 bg-rose-500/15 border-rose-500/40', category: 'Topology' };
    }
    if (s.includes('MULTI-BANK') || s.includes('CROSS-BORDER') || s.includes('HOPPING')) {
      return { icon: ArrowRightLeft, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', category: 'Routing' };
    }
    if (s.includes('RECIPIENTS')) {
      return { icon: Layers, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', category: 'Dispersion' };
    }
    if (s.includes('NORMAL') || s.includes('VERIFIED')) {
      return { icon: Clock, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', category: 'Baseline' };
    }
    return { icon: AlertTriangle, color: 'text-slate-300 bg-slate-800/80 border-slate-700', category: 'Indicator' };
  };

  if (variant === 'list') {
    return (
      <div id="risk-signals-list" className="space-y-2">
        {signals.map((signal, idx) => {
          const { icon: Icon, color, category } = getSignalMetadata(signal);
          return (
            <div
              key={idx}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-mono transition-colors ${color}`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="font-semibold tracking-wide">{signal}</span>
              </div>
              <span className="text-[10px] tracking-wider uppercase opacity-70 px-1.5 py-0.5 rounded bg-black/30">
                {category}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div id="risk-signals-badges" className="flex flex-wrap gap-1.5">
      {signals.map((signal, idx) => {
        const { icon: Icon, color } = getSignalMetadata(signal);
        return (
          <span
            key={idx}
            className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 border text-[11px] font-mono font-medium tracking-wide ${color}`}
          >
            <Icon className="w-3 h-3 shrink-0" />
            <span>{signal}</span>
          </span>
        );
      })}
    </div>
  );
};
