import React, { useState, useMemo } from 'react';
import { Transaction, DecisionType } from '../types';
import { RiskBadge } from './RiskBadge';
import { RiskScore } from './RiskScore';
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Clock,
  ChevronRight,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  onSelectTransaction: (tx: Transaction) => void;
  selectedId?: number | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

type SortField = 'created_at' | 'amount' | 'risk_score' | 'id';
type SortOrder = 'asc' | 'desc';

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onSelectTransaction,
  selectedId,
  onRefresh,
  isRefreshing = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [decisionFilter, setDecisionFilter] = useState<'ALL' | DecisionType>('ALL');
  const [bankFilter, setBankFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Distinct banks for filter dropdown
  const banks = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      set.add(t.sender_bank);
      set.add(t.receiver_bank);
    });
    return Array.from(set).sort();
  }, [transactions]);

  // Filter and sort transactions
  const filteredAndSorted = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            tx.id.toString().includes(q) ||
            tx.sender_account.toLowerCase().includes(q) ||
            tx.receiver_account.toLowerCase().includes(q) ||
            tx.sender_bank.toLowerCase().includes(q) ||
            tx.receiver_bank.toLowerCase().includes(q);
          if (!matches) return false;
        }

        // Decision filter
        if (decisionFilter !== 'ALL' && tx.decision !== decisionFilter) {
          return false;
        }

        // Bank filter
        if (
          bankFilter !== 'ALL' &&
          tx.sender_bank !== bankFilter &&
          tx.receiver_bank !== bankFilter
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: number | string = a[sortField];
        let valB: number | string = b[sortField];

        if (sortField === 'created_at') {
          valA = new Date(a.created_at).getTime();
          valB = new Date(b.created_at).getTime();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [transactions, searchQuery, decisionFilter, bankFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatAmount = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div id="transaction-table-container" className="rounded-xl border border-slate-800 bg-[#0a0f19] flex flex-col shadow-sm">
      {/* Control bar: search, filters, refresh */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#080d15]">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-transactions"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by TX ID, account, or bank..."
              className="w-full bg-[#05080e] border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Decision filter pill */}
          <div className="flex items-center bg-[#05080e] p-0.5 rounded-lg border border-slate-800 text-xs font-mono">
            {(['ALL', 'ALLOW', 'HOLD', 'BLOCK'] as const).map((dec) => (
              <button
                key={dec}
                id={`filter-decision-${dec.toLowerCase()}`}
                onClick={() => setDecisionFilter(dec)}
                className={`px-2.5 py-1 rounded transition-colors text-[11px] font-semibold ${
                  decisionFilter === dec
                    ? dec === 'BLOCK'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : dec === 'HOLD'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : dec === 'ALLOW'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {dec}
              </button>
            ))}
          </div>

          {/* Bank filter */}
          <div className="relative">
            <select
              id="select-bank-filter"
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="bg-[#05080e] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="ALL">All Banks</option>
              {banks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {onRefresh && (
            <button
              id="btn-refresh-transactions"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg bg-[#05080e] border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="Refresh transactions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto [scrollbar-width:thin] [scrollbar-color:#1e293b_#06090f]">
        <table id="table-live-transactions" className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-mono uppercase tracking-wider text-slate-400 bg-[#060a12]">
              <th
                className="py-3 px-4 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort('id')}
              >
                <div className="flex items-center gap-1.5">
                  <span>TX ID</span>
                  {sortField === 'id' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </div>
              </th>
              <th className="py-3 px-4">Sender Bank</th>
              <th className="py-3 px-4">Receiver Bank</th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Amount</span>
                  {sortField === 'amount' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort('risk_score')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Risk Score</span>
                  {sortField === 'risk_score' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </div>
              </th>
              <th className="py-3 px-4">Decision</th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Time</span>
                  {sortField === 'created_at' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </div>
              </th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                  No transactions match the selected filters.
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((tx) => {
                const isSelected = selectedId === tx.id;
                return (
                  <tr
                    key={tx.id}
                    id={`tx-row-${tx.id}`}
                    onClick={() => onSelectTransaction(tx)}
                    className={`cursor-pointer transition-colors group ${
                      isSelected
                        ? 'bg-cyan-950/30 border-l-2 border-l-cyan-400'
                        : 'hover:bg-[#0e1626]'
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-slate-200 group-hover:text-cyan-300">
                      #{tx.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-slate-300 font-medium font-sans text-xs">{tx.sender_bank}</span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[130px]">{tx.sender_account}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-slate-300 font-medium font-sans text-xs">{tx.receiver_bank}</span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[130px]">{tx.receiver_account}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                      {formatAmount(tx.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <RiskScore score={tx.risk_score} size="sm" />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <RiskBadge decision={tx.decision} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                      {formatTime(tx.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 group-hover:text-cyan-300 transition-colors">
                        <span>Inspect</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer bar */}
      <div className="p-3 border-t border-slate-800 bg-[#080d15] flex items-center justify-between text-xs font-mono text-slate-500">
        <span>
          Showing <strong className="text-slate-300">{filteredAndSorted.length}</strong> of{' '}
          <strong className="text-slate-300">{transactions.length}</strong> telemetry frames
        </span>
        <span className="text-[11px] text-slate-400">
          Click any row to open forensic dossier
        </span>
      </div>
    </div>
  );
};
