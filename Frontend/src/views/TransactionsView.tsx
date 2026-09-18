import React from 'react';
import { Transaction } from '../types';
import { TransactionTable } from '../components/TransactionTable';
import { TransactionDetails } from '../components/TransactionDetails';
import { Layers, ShieldAlert, Sparkles, Filter } from 'lucide-react';

interface TransactionsViewProps {
  transactions: Transaction[];
  selectedTransaction: Transaction | null;
  onSelectTransaction: (tx: Transaction | null) => void;
  onInspectInGraph: (accountId: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  selectedTransaction,
  onSelectTransaction,
  onInspectInGraph,
  onRefresh,
  isRefreshing
}) => {
  return (
    <div id="transactions-dedicated-view" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#090e18] border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h1 className="text-lg font-bold font-mono text-white tracking-wide">
              Transaction Investigation Hub
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Audit wire settlements, behavioral velocities, and granular explainable risk signals.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="px-2 py-1 rounded bg-[#06090f] border border-slate-800">
            Total Captured: <strong className="text-white">{transactions.length}</strong>
          </span>
          <span className="px-2 py-1 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30">
            Blocked: <strong className="text-rose-400">{transactions.filter(t => t.decision === 'BLOCK').length}</strong>
          </span>
        </div>
      </div>

      {/* Main Grid: Table & Investigation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className={selectedTransaction ? 'lg:col-span-6' : 'lg:col-span-12'}>
          <TransactionTable
            transactions={transactions}
            onSelectTransaction={onSelectTransaction}
            selectedId={selectedTransaction?.id}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
          />
        </div>

        {selectedTransaction ? (
          <div className="lg:col-span-6 sticky top-20 animate-in fade-in slide-in-from-right-4">
            <TransactionDetails
              transaction={selectedTransaction}
              onClose={() => onSelectTransaction(null)}
              onInspectInGraph={onInspectInGraph}
            />
          </div>
        ) : (
          <div className="hidden lg:flex lg:col-span-6 flex-col items-center justify-center p-12 text-center bg-[#090e18]/40 rounded-2xl border border-dashed border-slate-800 min-h-[460px]">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
              <ShieldAlert className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold font-mono text-slate-300 mb-1">
              No Transaction Selected
            </h3>
            <p className="text-xs font-mono text-slate-500 max-w-xs leading-relaxed">
              Click any transaction in the ledger to open its explainable risk dossier, signal decomposition, and flow visualization.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
