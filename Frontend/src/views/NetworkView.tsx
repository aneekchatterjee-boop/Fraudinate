import React, { useState } from 'react';
import { GraphData, GraphNode } from '../types';
import { NetworkGraph } from '../components/NetworkGraph';
import {
  Network,
  ShieldAlert,
  SlidersHorizontal,
  Info,
  Maximize2,
  Minimize2,
  Layers,
  ArrowRight
} from 'lucide-react';

interface NetworkViewProps {
  graphData: GraphData;
  onFilterTransactions: (accountOrBank: string) => void;
  selectedNodeId?: string | null;
  onSelectNode?: (node: GraphNode | null) => void;
}

export const NetworkView: React.FC<NetworkViewProps> = ({
  graphData,
  onFilterTransactions,
  selectedNodeId,
  onSelectNode
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const muleCount = graphData.nodes.filter((n) => n.is_mule || n.risk_score > 75).length;
  const bankCount = graphData.nodes.filter((n) => n.type === 'bank').length;

  return (
    <div
      id="network-intelligence-view"
      className={`space-y-4 ${isFullScreen ? 'fixed inset-0 z-50 bg-[#06090f] p-4 flex flex-col space-y-2' : ''}`}
    >
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#090e18] border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-purple-400" />
            <h1 className="text-lg font-bold font-mono text-white tracking-wide">
              Network Intelligence & Coordinated Mule Topology
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Identify synthetic account rings, rapid dispersion funnels, and multi-bank money mule routes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/40">
              Mules Active: <strong>{muleCount}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/40">
              Bank Rails: <strong>{bankCount}</strong>
            </span>
          </div>

          <button
            id="btn-toggle-fullscreen-graph"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            title={isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen Canvas'}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullScreen ? 'Exit Full' : 'Full Screen'}</span>
          </button>
        </div>
      </div>

      {/* Network Graph Container */}
      <div className={isFullScreen ? 'flex-1 w-full h-[calc(100vh-100px)]' : 'w-full'}>
        <NetworkGraph
          data={graphData}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onFilterTransactions={onFilterTransactions}
          height={isFullScreen ? 'h-full' : 'h-[720px]'}
        />
      </div>
    </div>
  );
};
