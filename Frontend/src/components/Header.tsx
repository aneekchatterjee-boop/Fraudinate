import React from 'react';
import { ActiveView } from '../types';
import {
  ShieldAlert,
  Flame,
  Activity,
  Network,
  Bell,
  Play,
  Server,
  Layers,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  currentView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  systemStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  backendConnected: boolean;
  onOpenDemoController: () => void;
  onSimulateTx: () => void;
  unreadAlertsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  systemStatus,
  backendConnected,
  onOpenDemoController,
  onSimulateTx,
  unreadAlertsCount = 2
}) => {
  const navItems: { view: ActiveView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { view: 'overview', label: 'Overview', icon: Activity },
    { view: 'transactions', label: 'Transactions', icon: Layers },
    { view: 'network', label: 'Network', icon: Network },
    { view: 'alerts', label: 'Alerts', icon: Bell }
  ];

  return (
    <header
      id="main-header"
      className="sticky top-0 z-40 w-full bg-[#06090f]/90 border-b border-slate-800 backdrop-blur-md px-4 lg:px-6 py-3"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & System Status */}
        <div className="flex items-center gap-6">
          <div
            id="brand-logo"
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 via-cyan-500/15 to-transparent border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:border-emerald-400 transition-colors">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-widest text-base text-white font-mono flex items-center gap-1.5">
                FRAUDINATE
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono font-bold">
                  FW-v2
                </span>
              </span>
              <span className="text-[9px] font-mono text-slate-400 tracking-wider uppercase -mt-0.5">
                Financial Transaction Firewall
              </span>
            </div>
          </div>

          {/* System Online Indicator */}
          <div
            id="system-status-indicator"
            className="hidden sm:flex flex-row flex-nowrap items-center shrink-0 gap-2 px-2.5 py-1 rounded-full bg-[#0b121e] border border-slate-800 text-[11px] font-mono whitespace-nowrap"
            title={backendConnected ? 'Connected to Flask Backend' : 'Autonomous Firewall Heuristic Engine Active'}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-semibold tracking-wider text-slate-200 whitespace-nowrap inline-flex items-center gap-1">
              <span>SYSTEM</span>
              <span>ONLINE</span>
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav id="desktop-navigation" className="hidden md:flex items-center gap-1 bg-[#090e18] p-1 rounded-xl border border-slate-800/80">
          {navItems.map(({ view, label, icon: Icon }) => {
            const isActive = currentView === view;
            return (
              <button
                key={view}
                id={`nav-link-${view}`}
                onClick={() => onNavigate(view)}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{label}</span>
                {view === 'alerts' && unreadAlertsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/30 text-rose-300 font-bold border border-rose-500/40">
                    {unreadAlertsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Hackathon Demo CTA & Simulators */}
        <div className="flex items-center gap-2">
          {/* Hackathon Story Walkthrough Button */}
          <button
            id="btn-trigger-demo-walkthrough"
            onClick={onOpenDemoController}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-mono text-xs font-bold tracking-wide flex items-center gap-2 shadow-lg shadow-cyan-950/40 border border-cyan-400/40 transition-all cursor-pointer"
            title="Start Hackathon Judge Walkthrough"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-pulse drop-shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
            <span>Judge Demo Story</span>
          </button>

          {/* Quick Inject TX */}
          <button
            id="btn-quick-inject-tx"
            onClick={onSimulateTx}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c1220] hover:bg-[#121c32] text-slate-300 border border-slate-800 text-xs font-mono transition-colors"
            title="Inject simulated live transaction"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate TX</span>
          </button>

          {/* Landing toggle */}
          {currentView !== 'landing' ? (
            <button
              id="btn-return-landing"
              onClick={() => onNavigate('landing')}
              className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 text-xs font-mono transition-colors"
              title="View Public Landing Page"
            >
              Landing
            </button>
          ) : (
            <button
              id="btn-enter-dashboard-header"
              onClick={() => onNavigate('overview')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono border border-slate-700 transition-colors"
            >
              Dashboard
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
