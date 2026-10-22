import React, { useState } from 'react';
import { Transaction, SystemStats, DecisionType } from '../types';
import { StatCard } from '../components/StatCard';
import { TransactionTable } from '../components/TransactionTable';
import { TransactionDetails } from '../components/TransactionDetails';
import {
  Activity,
  ShieldBan,
  AlertTriangle,
  Network,
  Zap,
  Radio,
  Flame,
  Filter,
  CheckCircle2
} from 'lucide-react';

interface DashboardViewProps {
  stats: SystemStats;
  transactions: Transaction[];
  selectedTransaction: Transaction | null;
  onSelectTransaction: (tx: Transaction | null) => void;
  onInspectInGraph: (accountId: string) => void;
  onRefreshFeed: () => void;
  isRefreshing: boolean;
  onOpenSimulator: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  transactions,
  selectedTransaction,
  onSelectTransaction,
  onInspectInGraph,
  onRefreshFeed,
  isRefreshing,
  onOpenSimulator
}) => {
  return (
    <div id="dashboard-overview-view" className="space-y-6">
      {/* Top Banner with live telemetry status */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#090e18] border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <h1 className="text-lg font-bold font-mono text-white tracking-wide">
              Security Operations Center (SOC) Feed
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Live heuristic firewall pipeline • Autonomous mule clustering engine active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-open-simulator-soc"
            onClick={onOpenSimulator}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate / Analyze Payload</span>
          </button>
        </div>
      </div>

      {/* Dashboard KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Transactions Processed */}
        <StatCard
          title="Transactions Processed"
          value={stats.transactions_processed}
          subtitle="Real-time settlement throughput"
          change="+14.2% today"
          changeType="positive"
          icon={Activity}
          accentColor="indigo"
        />

        {/* 2. Transactions Blocked */}
        <StatCard
          title="Transactions Blocked"
          value={stats.transactions_blocked}
          subtitle="Autonomous firewall halts"
          change="100% prevented"
          changeType="negative"
          icon={ShieldBan}
          accentColor="rose"
        />

        {/* 3. High-Risk Transactions */}
        <StatCard
          title="High-Risk Transactions"
          value={stats.high_risk_transactions}
          subtitle="Risk Score ≥ 60"
          change="Flagged for manual review"
          changeType="neutral"
          icon={AlertTriangle}
          accentColor="amber"
        />

        {/* 4. Suspicious Networks */}
        <StatCard
          title="Suspicious Networks"
          value={stats.suspicious_networks}
          subtitle="Coordinated mule rings detected"
          change="Graph anomalies active"
          changeType="negative"
          icon={Network}
          accentColor="cyan"
        />
      </div>

      {/* Main Area: Live Transaction Feed & Investigation Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className={selectedTransaction ? 'lg:col-span-7' : 'lg:col-span-12'}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                Live Transaction Feed
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Firewall Latency: {stats.firewall_latency_ms}ms
            </span>
          </div>

          <TransactionTable
            transactions={transactions}
            onSelectTransaction={onSelectTransaction}
            selectedId={selectedTransaction?.id}
            onRefresh={onRefreshFeed}
            isRefreshing={isRefreshing}
          />
        </div>

        {/* Investigation Side Panel when a transaction is selected */}
        {selectedTransaction && (
          <div className="lg:col-span-5 sticky top-20 animate-in fade-in slide-in-from-right-4">
            <TransactionDetails
              transaction={selectedTransaction}
              onClose={() => onSelectTransaction(null)}
              onInspectInGraph={onInspectInGraph}
            />
          </div>
        )}
      </div>
    </div>
  );
};
