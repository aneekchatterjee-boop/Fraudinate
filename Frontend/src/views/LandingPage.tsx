import React from 'react';
import { ActiveView, SystemStats } from '../types';
import {
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Activity,
  Network,
  ShieldCheck,
  ShieldBan,
  Building2,
  Lock,
  Zap,
  Gauge,
  CheckCircle2,
  Layers,
  Flame
} from 'lucide-react';

interface LandingPageProps {
  onLaunchDashboard: () => void;
  onExploreDemo: () => void;
  stats: SystemStats;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchDashboard,
  onExploreDemo,
  stats
}) => {
  return (
    <div id="landing-page-view" className="min-h-screen bg-[#06090f] text-slate-100 flex flex-col selection:bg-cyan-500/20">
      {/* Background cyber grid & glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-cyan-500/10 via-emerald-500/5 to-transparent blur-3xl" />
        <div className="absolute top-32 -left-48 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl" />
        <div className="absolute top-48 -right-48 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 flex flex-col">
        {/* System Online pill */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0b121e] border border-slate-800 text-xs font-mono text-slate-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold text-emerald-400">SOC READY</span>
            <span className="text-slate-600">•</span>
            <span>Sub-15ms Financial Settlement Firewall</span>
          </div>
        </div>

        {/* Hero Headline */}
        <div className="text-center max-w-4xl mx-auto mb-8">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight font-mono uppercase text-white leading-tight">
            THE REAL-TIME FINANCIAL <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400">
              TRANSACTION FIREWALL
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-sans leading-relaxed">
            Detect suspicious transactions and coordinated mule networks before fraudulent funds can propagate.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 font-mono text-sm">
            <button
              id="btn-hero-launch-dashboard"
              onClick={onLaunchDashboard}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-slate-950 font-bold tracking-wider flex items-center gap-2.5 shadow-xl shadow-cyan-950/50 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              id="btn-hero-explore-demo"
              onClick={onExploreDemo}
              className="px-6 py-3 rounded-xl bg-[#0e1626] hover:bg-[#141f36] text-slate-200 font-semibold border border-slate-700 hover:border-cyan-500/50 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Explore Demo</span>
            </button>
          </div>
        </div>

        {/* Visual representation of money moving between banks with suspicious activity detected */}
        <div className="my-10 max-w-5xl mx-auto w-full p-6 sm:p-8 rounded-2xl bg-[#090e18]/90 border border-slate-800 shadow-2xl relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800/80 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
              <span className="font-bold text-white uppercase tracking-wider">
                Live Inter-Bank Settlement Rails & Firewall Inspection
              </span>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono">
              ● Interception Engine Active
            </span>
          </div>

          {/* Animated money transfer diagram */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
            {/* Bank A Origin */}
            <div className="md:col-span-2 p-4 rounded-xl bg-[#060a12] border border-slate-800 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono">
                <Building2 className="w-4 h-4" />
                <span className="font-bold">JPMorgan Chase</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Acc: US-CHASE-88912</span>
              <div className="text-xs font-mono text-emerald-400 font-bold">
                Outflow: $48,500
              </div>
            </div>

            {/* In-flight firewall inspection */}
            <div className="md:col-span-3 p-4 rounded-xl bg-[#0d1422] border-2 border-dashed border-rose-500/60 relative flex flex-col items-center justify-center text-center">
              <div className="absolute -top-3 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold uppercase tracking-wider">
                Firewall Intercept
              </div>
              <div className="flex items-center gap-2 my-1">
                <ShieldBan className="w-5 h-5 text-rose-400 animate-bounce" />
                <span className="text-sm font-mono font-bold text-white">
                  BLOCKED (Risk 94/100)
                </span>
              </div>
              <p className="text-[11px] font-mono text-rose-300/90 max-w-xs">
                Mule signature verified: Rapid multi-hop fan-out across 4 downstream nodes.
              </p>
            </div>

            {/* Bank B Destination / Mule */}
            <div className="md:col-span-2 p-4 rounded-xl bg-[#060a12] border border-rose-500/40 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono">
                <Building2 className="w-4 h-4" />
                <span className="font-bold">Wells Fargo</span>
              </div>
              <span className="text-[11px] font-mono text-rose-400 font-bold">
                Acc: US-WF-44219 (Mule Node)
              </span>
              <div className="text-[10px] font-mono text-rose-400">
                HOLD & ISOLATED
              </div>
            </div>
          </div>
        </div>

        {/* 3 Feature Sections */}
        <div className="mt-12">
          <div className="text-center mb-10">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">
              Core Capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-mono text-white mt-1">
              Multi-Layered Financial Defense System
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1: Transaction Intelligence */}
            <div
              id="feature-transaction-intelligence"
              className="p-6 rounded-2xl bg-[#090e18] border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold font-mono text-white mb-2">
                  1. Transaction Intelligence
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed font-sans mb-4">
                  Analyze transaction behavior in real time and generate explainable risk scores without relying on black-box opacity.
                </p>
              </div>
              <ul className="space-y-2 text-xs font-mono text-slate-300 pt-4 border-t border-slate-800/80">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Sub-15ms wire evaluation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Burst velocity profiling</span>
                </li>
              </ul>
            </div>

            {/* Feature 2: Network Intelligence */}
            <div
              id="feature-network-intelligence"
              className="p-6 rounded-2xl bg-[#090e18] border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Network className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold font-mono text-white mb-2">
                  2. Network Intelligence
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed font-sans mb-4">
                  Identify suspicious entity relationships, layered funnels, and coordinated mule-account rings across disparate banking rails.
                </p>
              </div>
              <ul className="space-y-2 text-xs font-mono text-slate-300 pt-4 border-t border-slate-800/80">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Graph fan-out detection</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Synthetic identity clusters</span>
                </li>
              </ul>
            </div>

            {/* Feature 3: Real-Time Intervention */}
            <div
              id="feature-realtime-intervention"
              className="p-6 rounded-2xl bg-[#090e18] border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold font-mono text-white mb-2">
                  3. Real-Time Intervention
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed font-sans mb-4">
                  Generate automated ALLOW, HOLD, and BLOCK decisions at the network edge before fraud proceeds can be dispersed.
                </p>
              </div>
              <ul className="space-y-2 text-xs font-mono text-slate-300 pt-4 border-t border-slate-800/80">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Zero-delay settlement hold</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Fully explainable risk factors</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Small Statistics Section (API ready) */}
        <div className="mt-16 p-6 sm:p-8 rounded-2xl bg-[#080d16] border border-slate-800">
          <div className="text-center mb-6">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
              Live Firewall Telemetry
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-extrabold font-mono text-white">
                {stats.transactions_processed.toLocaleString()}
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1 uppercase">
                Transactions Analyzed
              </div>
            </div>

            <div>
              <div className="text-3xl font-extrabold font-mono text-rose-400">
                {stats.transactions_blocked.toLocaleString()}
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1 uppercase">
                Fraudulent Transfers Blocked
              </div>
            </div>

            <div>
              <div className="text-3xl font-extrabold font-mono text-amber-400">
                {stats.suspicious_networks}
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1 uppercase">
                Mule Rings Unmasked
              </div>
            </div>

            <div>
              <div className="text-3xl font-extrabold font-mono text-cyan-400">
                {stats.firewall_latency_ms} ms
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1 uppercase">
                Average Intercept Latency
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
