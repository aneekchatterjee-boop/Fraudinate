import React from 'react';
import { DecisionType } from '../types';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

interface RiskBadgeProps {
  decision: DecisionType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  decision,
  size = 'md',
  showIcon = true
}) => {
  const getStyles = () => {
    switch (decision) {
      case 'ALLOW':
        return {
          container: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15',
          dot: 'bg-emerald-400',
          icon: ShieldCheck
        };
      case 'HOLD':
        return {
          container: 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/15',
          dot: 'bg-amber-400',
          icon: ShieldAlert
        };
      case 'BLOCK':
        return {
          container: 'bg-rose-500/15 text-rose-400 border-rose-500/40 hover:bg-rose-500/20',
          dot: 'bg-rose-400 animate-pulse',
          icon: ShieldX
        };
      default:
        return {
          container: 'bg-slate-500/10 text-slate-400 border-slate-700',
          dot: 'bg-slate-400',
          icon: ShieldCheck
        };
    }
  };

  const { container, dot, icon: Icon } = getStyles();

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 tracking-wider gap-1.5 font-mono font-medium',
    md: 'text-xs px-2.5 py-1 tracking-wider gap-1.5 font-mono font-semibold',
    lg: 'text-sm px-3.5 py-1.5 tracking-widest gap-2 font-mono font-bold'
  }[size];

  return (
    <span
      id={`risk-badge-${decision.toLowerCase()}`}
      className={`inline-flex items-center rounded border uppercase transition-colors whitespace-nowrap ${container} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {showIcon && <Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} />}
      <span>{decision}</span>
    </span>
  );
};
