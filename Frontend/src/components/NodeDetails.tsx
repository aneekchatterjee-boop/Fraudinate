import React from 'react';
import { GraphNode } from '../types';
import { RiskScore } from './RiskScore';
import { RiskSignals } from './RiskSignals';
import {
  X,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  Network,
  ShieldAlert,
  ShieldCheck,
  ShieldBan,
  Activity,
  AlertCircle
} from 'lucide-react';

interface NodeDetailsProps {
  node: GraphNode | null;
  onClose: () => void;
  onFilterTransactions?: (accountOrBank: string) => void;
  onToggleFreeze?: (nodeId: string) => void;
}

export const NodeDetails: React.FC<NodeDetailsProps> = ({
  node,
  onClose,
  onFilterTransactions,
  onToggleFreeze
}) => {
  if (!node) return null;

  const isBank = node.type === 'bank';
  const isMule = node.is_mule || node.risk_score > 75;

  return (
    <div
      id="node-details-drawer"
      className="bg-[#0b101b] border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col w-full max-w-md h-full overflow-y-auto"
    >
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border ${
              isBank
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                : isMule
                ? 'bg-rose-500/15 text-rose-400 border-rose-500/40'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {isBank ? <Building2 className="w-5 h-5" /> : <Network className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                {isBank ? 'Financial Institution Hub' : 'Account Node Dossier'}
              </span>
              {node.status && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase ${
                    node.status === 'frozen'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : node.status === 'flagged'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {node.status}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white tracking-tight break-all">
              {node.label}
            </h3>
          </div>
        </div>
        <button
          id="btn-close-node-details"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close details"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="py-5 space-y-6">
        {/* Risk Score Panel */}
        <div className="p-4 rounded-xl bg-[#080d16] border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Network Risk Rating
            </span>
            <div className="text-xs text-slate-400 font-mono">
              {isMule ? (
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Coordinated Mule Suspect
                </span>
              ) : (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Low Structural Risk
                </span>
              )}
            </div>
          </div>
          <RiskScore score={node.risk_score} size="md" />
        </div>

        {/* Node Metadata & Bank */}
        <div className="space-y-3 font-mono text-xs">
          <div className="flex justify-between p-2.5 rounded-lg bg-[#080d16] border border-slate-800/80">
            <span className="text-slate-500">Institution Rail:</span>
            <span className="text-slate-200 font-semibold">{node.bank}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-lg bg-[#080d16] border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span className="text-[10px] text-slate-400 uppercase">Incoming Tx</span>
              </div>
              <span className="text-base font-bold text-slate-100">
                {node.incoming_count ?? (isBank ? 128 : 3)}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#080d16] border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-cyan-400 mb-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span className="text-[10px] text-slate-400 uppercase">Outgoing Tx</span>
              </div>
              <span className="text-base font-bold text-slate-100">
                {node.outgoing_count ?? (isBank ? 94 : 5)}
              </span>
            </div>
          </div>
        </div>

        {/* Detected Signals */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Detected Graph Signals
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Topology Heuristics
            </span>
          </div>
          <RiskSignals
            signals={
              node.signals && node.signals.length > 0
                ? node.signals
                : isMule
                ? [
                    'HIGH NETWORK FAN-OUT',
                    'RAPID FUND MOVEMENT',
                    'MULTI-BANK CONNECTION',
                    'SUSPICIOUS CONNECTION CLUSTER'
                  ]
                : ['NORMAL TOPOLOGY', 'ESTABLISHED COUNTERPARTIES']
            }
            variant="list"
          />
        </div>

        {/* Action Controls */}
        <div className="space-y-2 pt-2">
          {onFilterTransactions && (
            <button
              id="btn-filter-transactions-by-node"
              onClick={() => onFilterTransactions(node.label)}
              className="w-full py-2.5 px-3 rounded-lg bg-[#141d2f] hover:bg-[#1b263d] text-cyan-300 border border-cyan-500/30 font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Filter Feed for {node.label}</span>
            </button>
          )}

          {onToggleFreeze && !isBank && (
            <button
              id="btn-toggle-freeze-node"
              onClick={() => onToggleFreeze(node.id)}
              className={`w-full py-2.5 px-3 rounded-lg font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-colors border ${
                node.status === 'frozen'
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}
            >
              <ShieldBan className="w-3.5 h-3.5" />
              <span>
                {node.status === 'frozen' ? 'Unfreeze & Restore Routing' : 'Emergency Freeze Account (Firewall)'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
