import React, { useState } from 'react';
import { SecurityAlert } from '../types';
import { AlertCard } from '../components/AlertCard';
import { RiskScore } from '../components/RiskScore';
import { RiskSignals } from '../components/RiskSignals';
import {
  Bell,
  AlertOctagon,
  ShieldAlert,
  Building2,
  Users,
  DollarSign,
  Clock,
  ArrowRight,
  ExternalLink,
  ShieldBan,
  CheckCircle2,
  Filter
} from 'lucide-react';

interface AlertsViewProps {
  alerts: SecurityAlert[];
  onInvestigateInGraph: (nodeId: string) => void;
  onFilterTransactionsByAlert: (alert: SecurityAlert) => void;
  onResolveAlert?: (alertId: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  onInvestigateInGraph,
  onFilterTransactionsByAlert,
  onResolveAlert
}) => {
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(
    alerts.length > 0 ? alerts[0].id : null
  );
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    return true;
  });

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) || alerts[0] || null;

  return (
    <div id="alerts-investigator-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#090e18] border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-rose-400" />
            <h1 className="text-lg font-bold font-mono text-white tracking-wide">
              Security Incident & Mule Ring Alerts
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Automated cyber-intelligence incidents requiring forensic evaluation or quarantine.
          </p>
        </div>

        {/* Severity Filter pills */}
        <div className="flex items-center bg-[#05080e] p-1 rounded-xl border border-slate-800 text-xs font-mono">
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as const).map((sev) => (
            <button
              key={sev}
              id={`filter-severity-${sev.toLowerCase()}`}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                severityFilter === sev
                  ? sev === 'CRITICAL'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : sev === 'HIGH'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : sev === 'MEDIUM'
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                    : 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Main 2-column layout: Alert list on left, deep investigation dossier on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Alerts List */}
        <div className="lg:col-span-6 space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-mono border border-dashed border-slate-800 rounded-xl">
              No alerts matching the selected severity level.
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                isSelected={selectedAlert?.id === alert.id}
                onInvestigate={(a) => setSelectedAlertId(a.id)}
              />
            ))
          )}
        </div>

        {/* Selected Alert Forensic Dossier */}
        {selectedAlert && (
          <div className="lg:col-span-6 sticky top-20 bg-[#090e18] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 animate-in fade-in">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-cyan-400 font-bold">
                    Incident #{selectedAlert.id}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs font-mono text-slate-400 uppercase">
                    {selectedAlert.alert_type}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {selectedAlert.title}
                </h2>
              </div>
              <RiskScore score={selectedAlert.risk_score} size="md" />
            </div>

            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              {selectedAlert.description}
            </p>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-[#06090f] border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-slate-500 text-[10px] block uppercase">Financial Blast Radius</span>
                <span className="text-base font-bold text-slate-100">
                  ${selectedAlert.amount_involved.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase">Implicated Accounts</span>
                <span className="text-base font-bold text-rose-400">
                  {selectedAlert.accounts_count} Nodes
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase">Involved Rails</span>
                <span className="text-base font-bold text-cyan-400">
                  {selectedAlert.banks_count} Banks
                </span>
              </div>
            </div>

            {/* Signals Responsible */}
            <div>
              <span className="text-xs font-mono uppercase text-slate-400 tracking-wider block mb-2">
                Triggered Heuristic Drivers
              </span>
              <RiskSignals signals={selectedAlert.signals} variant="list" />
            </div>

            {/* Investigator Actions */}
            <div className="pt-4 border-t border-slate-800/80 space-y-2.5 font-mono text-xs">
              <button
                id="btn-alert-investigate-graph"
                onClick={() =>
                  onInvestigateInGraph(selectedAlert.primary_account_id || 'acc-mule-central')
                }
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-cyan-950/40"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Unmask Mule Network in Graph</span>
              </button>

              <button
                id="btn-alert-view-transactions"
                onClick={() => onFilterTransactionsByAlert(selectedAlert)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0e1626] hover:bg-[#152037] text-slate-200 border border-slate-700 font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Filter Related Transactions Feed</span>
              </button>

              <button
                id="btn-alert-quarantine-mules"
                onClick={() => {
                  alert(`Quarantine command dispatched: Firewall holds applied to ${selectedAlert.accounts_count} suspect endpoints across ${selectedAlert.banks_count} rails.`);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ShieldBan className="w-4 h-4" />
                <span>Emergency Quarantine Suspect Mule Network</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
