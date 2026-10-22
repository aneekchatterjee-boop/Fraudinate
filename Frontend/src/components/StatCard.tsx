import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  badgeText?: string;
  accentColor?: 'emerald' | 'amber' | 'rose' | 'cyan' | 'indigo';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  changeType = 'neutral',
  icon: Icon,
  badgeText,
  accentColor = 'indigo'
}) => {
  const getAccent = () => {
    switch (accentColor) {
      case 'rose':
        return {
          iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          borderHover: 'hover:border-rose-500/40',
          glow: 'from-rose-500/5'
        };
      case 'amber':
        return {
          iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          borderHover: 'hover:border-amber-500/40',
          glow: 'from-amber-500/5'
        };
      case 'emerald':
        return {
          iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          borderHover: 'hover:border-emerald-500/40',
          glow: 'from-emerald-500/5'
        };
      case 'cyan':
        return {
          iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          borderHover: 'hover:border-cyan-500/40',
          glow: 'from-cyan-500/5'
        };
      default:
        return {
          iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          borderHover: 'hover:border-indigo-500/40',
          glow: 'from-indigo-500/5'
        };
    }
  };

  const accent = getAccent();

  return (
    <div
      id={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className={`relative overflow-hidden rounded-xl bg-[#0b101b] border border-slate-800/90 p-5 transition-all duration-200 ${accent.borderHover} shadow-sm group`}
    >
      <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full bg-gradient-to-br ${accent.glow} to-transparent pointer-events-none blur-xl`} />

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono tracking-wider uppercase text-slate-400 font-medium">
          {title}
        </span>
        <div className={`p-2 rounded-lg border ${accent.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold font-mono tracking-tight text-white group-hover:text-slate-100">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {badgeText && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {badgeText}
          </span>
        )}
      </div>

      {(subtitle || change) && (
        <div className="mt-2.5 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-500 font-mono text-[11px]">{subtitle}</span>}
          {change && (
            <span
              className={`font-mono text-[11px] font-medium ${
                changeType === 'positive'
                  ? 'text-emerald-400'
                  : changeType === 'negative'
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {change}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
