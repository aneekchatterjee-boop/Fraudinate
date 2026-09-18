import React from 'react';
import { Transaction } from '../types';
import { RiskBadge } from './RiskBadge';
import { RiskScore } from './RiskScore';
import { RiskSignals } from './RiskSignals';
import {
  X,
  ArrowRight,
  ShieldAlert,
  Building2,
  Clock,
  Gauge,
  Calendar,
  Share2,
  ExternalLink,
  ShieldBan
} from 'lucide-react';

interface TransactionDetailsProps {
  transaction: Transaction | null;
  onClose: () => void;
  onInspectInGraph?: (accountId: string) => void;
}

export const TransactionDetails: React.FC<TransactionDetailsProps> = ({
  transaction,
  onClose,
  onInspectInGraph
}) => {
  if (!transaction) return null;

  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(transaction.amount);

  const formattedDate = new Date(transaction.created_at).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium'
  });

  return (
    <div
      id="transaction-investigation-panel"
      className="bg-[#0b101b] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] w-full"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#090d16]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                Investigation Dossier
              </span>
              <span className="text-xs font-mono text-slate-500">•</span>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                TX #{transaction.id}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Transaction Risk Assessment
            </h2>
          </div>
        </div>

        <button
          id="btn-close-investigation-panel"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors"
          title="Close investigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="overflow-y-auto p-6 space-y-6">
        {/* Top summary row: Decision & Large Risk Score */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 p-5 bg-[#0e1524] rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Firewall Intervention Status
                </span>
                <RiskBadge decision={transaction.decision} size="lg" />
              </div>
              <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
                {formattedAmount}
              </div>
              <p className="text-xs font-mono text-slate-400 mt-2">
                Evaluated against coordinated mule signatures & cross-bank velocity heuristics.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-800 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px]">VELOCITY</span>
                <span className="text-slate-200 font-bold">{transaction.velocity} tx/min</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">ACCOUNT AGE</span>
                <span className="text-slate-200 font-bold">{transaction.account_age} days</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">RECIPIENTS</span>
                <span className="text-slate-200 font-bold">{transaction.recipients} endpoints</span>
              </div>
            </div>
          </div>

          {/* Large Risk Score Gauge */}
          <div className="flex items-center justify-center">
            <RiskScore score={transaction.risk_score} size="lg" />
          </div>
        </div>

        {/* Visual Transaction Flow: Sender -> Firewall -> Receiver */}
        <div className="p-5 bg-[#0e1524] rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Transaction Flow Visualization
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Direct settlement route inspection
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-center">
            {/* Sender */}
            <div className="md:col-span-3 p-4 rounded-xl bg-[#090d16] border border-slate-800">
              <div className="flex items-center gap-2 mb-2 text-slate-400">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Sender Origin
                </span>
              </div>
              <div className="text-sm font-semibold text-white">{transaction.sender_bank}</div>
              <div className="text-xs font-mono text-cyan-400 mt-1 break-all bg-black/40 p-1.5 rounded border border-slate-800/80">
                {transaction.sender_account}
              </div>
            </div>

            {/* Central Firewall Inspection Pillar */}
            <div className="md:col-span-1 flex flex-col items-center justify-center py-2">
              <div className="hidden md:flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                  transaction.decision === 'BLOCK'
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : transaction.decision === 'HOLD'
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                }`}>
                  <ArrowRight className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono mt-1 text-slate-500 uppercase tracking-tighter">
                  Inspection
                </span>
              </div>
            </div>

            {/* Receiver */}
            <div className="md:col-span-3 p-4 rounded-xl bg-[#090d16] border border-slate-800">
              <div className="flex items-center gap-2 mb-2 text-slate-400">
                <Building2 className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Receiver Destination
                </span>
              </div>
              <div className="text-sm font-semibold text-white">{transaction.receiver_bank}</div>
              <div className="text-xs font-mono text-purple-300 mt-1 break-all bg-black/40 p-1.5 rounded border border-slate-800/80">
                {transaction.receiver_account}
              </div>
            </div>
          </div>
        </div>

        {/* Explainable Risk Signals Section */}
        <div className="p-5 bg-[#0e1524] rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                Explainable Risk Signals
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Transparent causal drivers behind the automated {transaction.decision} decision
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {(transaction.signals ?? []).length} heuristics triggered
            </span>
          </div>

          <RiskSignals signals={transaction.signals ?? []} variant="list" />
        </div>

        {/* Telemetry metadata */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#090d16] border border-slate-800/70 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Captured: {formattedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-slate-500" />
            <span>Firewall Latency: 8.2 ms</span>
          </div>
          {onInspectInGraph && (
            <button
              id="btn-inspect-in-network-graph"
              onClick={() => onInspectInGraph(transaction.receiver_account)}
              className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-semibold hover:underline"
            >
              <span>Inspect in Network Graph</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
