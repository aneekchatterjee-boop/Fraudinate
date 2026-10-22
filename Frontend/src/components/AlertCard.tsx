import React from 'react';
import { SecurityAlert } from '../types';
import { RiskScore } from './RiskScore';
import { RiskSignals } from './RiskSignals';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  Clock,
  Building2,
  Users,
  DollarSign,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

interface AlertCardProps {
  alert: SecurityAlert;
  onInvestigate: (alert: SecurityAlert) => void;
  isSelected?: boolean;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  alert,
  onInvestigate,
  isSelected = false
}) => {
  const getSeverityConfig = (severity: SecurityAlert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          border: isSelected ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-rose-900/40 hover:border-rose-700/60',
          icon: AlertOctagon,
          iconColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
          dot: 'bg-rose-400 animate-pulse'
        };
      case 'HIGH':
        return {
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          border: isSelected ? 'border-amber-500 ring-1 ring-amber-500/30' : 'border-amber-900/40 hover:border-amber-700/60',
          icon: AlertTriangle,
          iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
          dot: 'bg-amber-400'
        };
      case 'MEDIUM':
        return {
          badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
          border: isSelected ? 'border-yellow-500 ring-1 ring-yellow-500/30' : 'border-slate-800 hover:border-slate-700',
          icon: ShieldAlert,
          iconColor: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
          dot: 'bg-yellow-400'
        };
      default:
        return {
          badge: 'bg-slate-800 text-slate-300 border-slate-700',
          border: isSelected ? 'border-slate-500 ring-1 ring-slate-500/30' : 'border-slate-800 hover:border-slate-700',
          icon: Info,
          iconColor: 'text-slate-400 bg-slate-800 border-slate-700',
          dot: 'bg-slate-400'
        };
    }
  };

  const config = getSeverityConfig(alert.severity);
  const Icon = config.icon;

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(alert.amount_involved ?? alert.amount ?? 0);

  const formattedTime = new Date(alert.timestamp ?? alert.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div
      id={`alert-card-${alert.id}`}
      onClick={() => onInvestigate(alert)}
      className={`p-5 rounded-xl bg-[#0a0f1a] border transition-all duration-200 cursor-pointer ${config.border} shadow-sm group`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${config.iconColor}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest uppercase border ${config.badge}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                {alert.severity}
              </span>
              <span className="text-[11px] font-mono text-slate-500">#{alert.id}</span>
              <span className="text-[11px] font-mono text-cyan-400 uppercase">
                {alert.alert_type}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-1 group-hover:text-cyan-200 transition-colors">
              {alert.title}
            </h3>
          </div>
        </div>

        <RiskScore score={alert.risk_score} size="md" />
      </div>

      <p className="text-xs text-slate-400 leading-relaxed mb-4 font-sans line-clamp-2">
        {alert.description}
      </p>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-lg bg-[#070b13] border border-slate-800/80 text-xs font-mono mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-3.5 h-3.5 text-slate-500" />
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Exposure</span>
            <span className="font-bold text-slate-200">{formattedAmount}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Accounts</span>
            <span className="font-bold text-slate-200">{alert.accounts_count ?? 2} nodes</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          <div>
            <span className="text-[10px] text-slate-500 block uppercase">Banks</span>
            <span className="font-bold text-slate-200">{alert.banks_count ?? new Set([
  alert.sender_bank,
  alert.receiver_bank,
]).size} rails</span>
          </div>
        </div>
      </div>

      {/* Signals preview */}
      <div className="mb-3">
        <RiskSignals signals={alert.signals.slice(0, 3)} size="sm" />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs font-mono text-slate-500">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>{formattedTime}</span>
        </div>
        <div className="inline-flex items-center gap-1 text-cyan-400 group-hover:text-cyan-300 font-medium">
          <span>Investigate in Graph</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
};
