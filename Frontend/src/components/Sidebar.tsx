import React from 'react';
import { ActiveView } from '../types';
import {
  Activity,
  Layers,
  Network,
  Bell,
  Home,
  ShieldAlert,
  Server,
  Terminal,
  Zap,
  Lock
} from 'lucide-react';

interface SidebarProps {
  currentView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  isOpen: boolean;
  onClose: () => void;
  unreadAlertsCount?: number;
  stats?: {
    processed: number;
    blocked: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpen,
  onClose,
  unreadAlertsCount = 2,
  stats
}) => {
  const navItems = [
    { view: 'landing' as ActiveView, label: 'Landing Page', icon: Home },
    { view: 'overview' as ActiveView, label: 'Overview SOC', icon: Activity },
    { view: 'transactions' as ActiveView, label: 'Live Transactions', icon: Layers },
    { view: 'network' as ActiveView, label: 'Network Intelligence', icon: Network },
    { view: 'alerts' as ActiveView, label: 'Security Alerts', icon: Bell, badge: unreadAlertsCount }
  ];

  if (!isOpen) return null;

  return (
    <div
      id="sidebar-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex md:hidden"
      onClick={onClose}
    >
      <div
        id="sidebar-panel"
        className="w-72 bg-[#080d16] border-r border-slate-800 h-full p-6 flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-mono font-bold text-white text-base tracking-widest">
                FRAUDINATE
              </h2>
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                Transaction Firewall
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map(({ view, label, icon: Icon, badge }) => {
              const isActive = currentView === view;
              return (
                <button
                  key={view}
                  id={`sidebar-link-${view}`}
                  onClick={() => {
                    onNavigate(view);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-mono transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-white font-bold border border-slate-700'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>{label}</span>
                  </div>
                  {badge !== undefined && badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Quick Stats */}
        <div className="p-4 rounded-xl bg-[#05080e] border border-slate-800/80 text-xs font-mono space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase tracking-wider">Firewall Status</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ARMED
            </span>
          </div>
          {stats && (
            <div className="pt-2 border-t border-slate-800 flex justify-between text-slate-300 text-[11px]">
              <span>Blocked:</span>
              <span className="text-rose-400 font-bold">{stats.blocked.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
