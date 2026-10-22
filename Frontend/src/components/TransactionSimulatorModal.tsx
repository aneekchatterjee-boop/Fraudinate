import React, { useState } from 'react';
import { TransactionAnalysisRequest, TransactionAnalysisResponse } from '../types';
import { api } from '../services/api';
import { RiskBadge } from './RiskBadge';
import { RiskScore } from './RiskScore';
import { RiskSignals } from './RiskSignals';
import {
  X,
  Play,
  Flame,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Zap,
  Building2,
  DollarSign
} from 'lucide-react';

interface TransactionSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionCreated?: () => void;
}

export const TransactionSimulatorModal: React.FC<TransactionSimulatorModalProps> = ({
  isOpen,
  onClose,
  onTransactionCreated
}) => {
  const [senderBank, setSenderBank] = useState('JPMorgan Chase');
  const [senderAccount, setSenderAccount] = useState('US-CHASE-88912');
  const [receiverBank, setReceiverBank] = useState('Wells Fargo');
  const [receiverAccount, setReceiverAccount] = useState('US-WF-44219 (Mule Node)');
  const [amount, setAmount] = useState<number>(48500);
  const [velocity, setVelocity] = useState<number>(8.4);
  const [accountAge, setAccountAge] = useState<number>(14);
  const [recipients, setRecipients] = useState<number>(6);

  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TransactionAnalysisResponse | null>(null);

  if (!isOpen) return null;

  const handleRunAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const payload: TransactionAnalysisRequest = {
      sender_bank: senderBank,
      sender_account: senderAccount,
      receiver_bank: receiverBank,
      receiver_account: receiverAccount,
      amount,
      velocity,
      account_age: accountAge,
      recipients
    };

    const res = await api.analyzeTransaction(payload);
    setAnalysisResult(res);
    setIsLoading(false);

    // Also inject into live transaction feed
    api.injectSimulatedTransaction({
      sender_bank: senderBank,
      sender_account: senderAccount,
      receiver_bank: receiverBank,
      receiver_account: receiverAccount,
      amount,
      velocity,
      account_age: accountAge,
      recipients,
      risk_score: res.risk_score,
      decision: res.decision,
      signals: res.signals
    });

    if (onTransactionCreated) {
      onTransactionCreated();
    }
  };

  const loadPreset = (type: 'normal' | 'mule' | 'velocity') => {
    if (type === 'normal') {
      setSenderBank('Citibank');
      setSenderAccount('US-CITI-12093');
      setReceiverBank('Bank of America');
      setReceiverAccount('US-BOA-77401');
      setAmount(1200);
      setVelocity(0.8);
      setAccountAge(650);
      setRecipients(1);
    } else if (type === 'mule') {
      setSenderBank('JPMorgan Chase');
      setSenderAccount('US-CHASE-88912');
      setReceiverBank('Wells Fargo');
      setReceiverAccount('US-WF-44219 (Mule Node)');
      setAmount(48500);
      setVelocity(8.4);
      setAccountAge(14);
      setRecipients(7);
    } else {
      setSenderBank('Barclays Private');
      setSenderAccount('UK-BARC-77312');
      setReceiverBank('Revolut Neo');
      setReceiverAccount('UK-REV-88321');
      setAmount(16400);
      setVelocity(6.2);
      setAccountAge(25);
      setRecipients(4);
    }
  };

  return (
    <div
      id="simulator-modal-overlay"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="simulator-modal-dialog"
        className="bg-[#0b101b] border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-mono">
                Transaction Firewall Analyzer (POST /api/transactions/analyze)
              </h3>
              <p className="text-xs text-slate-400">
                Send a custom transaction packet to test real-time risk scoring and intervention.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 py-3 border-b border-slate-800/80 text-xs font-mono">
          <span className="text-slate-500 uppercase text-[10px]">Test Presets:</span>
          <button
            type="button"
            onClick={() => loadPreset('normal')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px]"
          >
            Legitimate Retail Wire ($1.2k)
          </button>
          <button
            type="button"
            onClick={() => loadPreset('mule')}
            className="px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-[11px]"
          >
            Coordinated Mule Inflow ($48.5k)
          </button>
          <button
            type="button"
            onClick={() => loadPreset('velocity')}
            className="px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[11px]"
          >
            High Velocity Cross-Border ($16.4k)
          </button>
        </div>

        <form onSubmit={handleRunAnalysis} className="py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">
                Sender Bank
              </label>
              <input
                type="text"
                value={senderBank}
                onChange={(e) => setSenderBank(e.target.value)}
                className="w-full bg-[#070b13] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">
                Sender Account
              </label>
              <input
                type="text"
                value={senderAccount}
                onChange={(e) => setSenderAccount(e.target.value)}
                className="w-full bg-[#070b13] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">
                Receiver Bank
              </label>
              <input
                type="text"
                value={receiverBank}
                onChange={(e) => setReceiverBank(e.target.value)}
                className="w-full bg-[#070b13] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">
                Receiver Account
              </label>
              <input
                type="text"
                value={receiverAccount}
                onChange={(e) => setReceiverAccount(e.target.value)}
                className="w-full bg-[#070b13] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">
                Transfer Amount ($ USD)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-[#070b13] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">
                Velocity (Tx / min)
              </label>
              <input
                type="number"
                step="0.1"
                value={velocity}
                onChange={(e) => setVelocity(Number(e.target.value))}
                className="w-full bg-[#070b13] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">
                Account Age (Days)
              </label>
              <input
                type="number"
                value={accountAge}
                onChange={(e) => setAccountAge(Number(e.target.value))}
                className="w-full bg-[#070b13] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">
                Recent Counterparty Recipients
              </label>
              <input
                type="number"
                value={recipients}
                onChange={(e) => setRecipients(Number(e.target.value))}
                className="w-full bg-[#070b13] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 transition-all cursor-pointer disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            <span>{isLoading ? 'Evaluating Heuristics...' : 'Firewall & Intercept Transaction'}</span>
          </button>
        </form>

        {/* Live Analysis Result Card */}
        {analysisResult && (
          <div className="mt-4 p-4 rounded-xl bg-[#070b13] border border-slate-800 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                Firewall Inspection Verdict
              </span>
              <div className="flex items-center gap-2">
                <RiskBadge decision={analysisResult.decision} size="md" />
                <RiskScore score={analysisResult.risk_score} size="md" />
              </div>
            </div>

            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              {analysisResult.explanation}
            </p>

            <RiskSignals signals={analysisResult.signals} size="sm" />

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800">
              <span>Latency: {analysisResult.latency_ms} ms</span>
              <span>Injected into live telemetry feed</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
