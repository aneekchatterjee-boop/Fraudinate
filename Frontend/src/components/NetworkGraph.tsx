import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { GraphData, GraphNode, GraphEdge } from '../types';
import { NodeDetails } from './NodeDetails';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  Filter,
  Layers,
  Building2,
  Network,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  Info,
  SlidersHorizontal,
  Clock
} from 'lucide-react';

interface NetworkGraphProps {
  data: GraphData;
  onSelectNode?: (node: GraphNode | null) => void;
  selectedNodeId?: string | null;
  onFilterTransactions?: (accountOrBank: string) => void;
  height?: string;
  isInteractive?: boolean;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  data,
  onSelectNode,
  selectedNodeId: propSelectedNodeId,
  onFilterTransactions,
  height = 'h-[640px]',
  isInteractive = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Zoom & Pan state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Selected & Hovered state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(propSelectedNodeId || null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Dragging node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Editable local node coordinates to allow user to drag & reposition nodes freely
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  // Filter controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBank, setSelectedBank] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'LOW'>('ALL');
  const [timeRange, setTimeRange] = useState<'15m' | '1h' | '24h'>('1h');
  const [showLegend, setShowLegend] = useState(true);

  // Sync prop selectedNodeId
  useEffect(() => {
    if (propSelectedNodeId !== undefined) {
      setSelectedNodeId(propSelectedNodeId);
    }
  }, [propSelectedNodeId]);

  // Initialize node positions
  useEffect(() => {
    const posMap: Record<string, { x: number; y: number }> = {};
    const width = 1000;
    const heightVal = 600;

    data.nodes.forEach((node, i) => {
      if (node.x !== undefined && node.y !== undefined) {
        posMap[node.id] = { x: node.x, y: node.y };
      } else {
        // Compute circular/layered fallback layout
        const angle = (i / data.nodes.length) * 2 * Math.PI;
        const radius = node.type === 'bank' ? 220 : 140;
        posMap[node.id] = {
          x: width / 2 + Math.cos(angle) * radius,
          y: heightVal / 2 + Math.sin(angle) * radius
        };
      }
    });

    setNodePositions(posMap);
  }, [data.nodes]);

  // Distinct banks
  const banks = useMemo(() => {
    const set = new Set<string>();
    data.nodes.forEach((n) => set.add(n.bank));
    return Array.from(set).sort();
  }, [data.nodes]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return data.nodes.filter((node) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          node.label.toLowerCase().includes(q) ||
          node.bank.toLowerCase().includes(q) ||
          node.id.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Bank filter
      if (selectedBank !== 'ALL' && node.bank !== selectedBank) {
        return false;
      }

      // Risk filter
      if (riskFilter === 'CRITICAL' && node.risk_score < 80) return false;
      if (riskFilter === 'HIGH' && node.risk_score < 60) return false;
      if (riskFilter === 'LOW' && node.risk_score >= 60) return false;

      return true;
    });
  }, [data.nodes, searchQuery, selectedBank, riskFilter]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  // Filtered edges
  const filteredEdges = useMemo(() => {
    return data.edges.filter(
      (edge) => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
    );
  }, [data.edges, filteredNodeIds]);

  // Node by ID map
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    data.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [data.nodes]);

  // Selected node object
  const activeSelectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodeMap.get(selectedNodeId) || null;
  }, [selectedNodeId, nodeMap]);

  // Connected nodes & edges to currently hovered or selected node
  const activeTargetId = hoveredNodeId || selectedNodeId;
  const connectedNodeIds = useMemo(() => {
    if (!activeTargetId) return null;
    const set = new Set<string>([activeTargetId]);
    data.edges.forEach((edge) => {
      if (edge.source === activeTargetId) set.add(edge.target);
      if (edge.target === activeTargetId) set.add(edge.source);
    });
    return set;
  }, [activeTargetId, data.edges]);

  // Zoom handlers
  const handleZoom = (factor: number) => {
    setTransform((prev) => {
      const newScale = Math.min(Math.max(prev.scale * factor, 0.4), 2.5);
      return { ...prev, scale: newScale };
    });
  };

  const handleResetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
    setSelectedNodeId(null);
  };

  const handleFocusMules = () => {
    // Zoom in on central mule cluster
    const mulePos = nodePositions['acc-mule-central'];
    if (mulePos) {
      setTransform({
        x: -mulePos.x * 1.3 + 500,
        y: -mulePos.y * 1.3 + 300,
        scale: 1.3
      });
      setSelectedNodeId('acc-mule-central');
    }
  };

  // Pan interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as HTMLElement).id === 'graph-backdrop') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      }));
    } else if (draggingNodeId && nodePositions[draggingNodeId]) {
      // Dragging a node
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const rawX = (e.clientX - rect.left - transform.x) / transform.scale;
        const rawY = (e.clientY - rect.top - transform.y) / transform.scale;
        setNodePositions((prev) => ({
          ...prev,
          [draggingNodeId]: {
            x: Math.round(rawX - dragOffset.x),
            y: Math.round(rawY - dragOffset.y)
          }
        }));
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    handleZoom(zoomFactor);
  };

  const handleNodeClick = (node: GraphNode, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = selectedNodeId === node.id ? null : node.id;
    setSelectedNodeId(newId);
    if (onSelectNode) onSelectNode(newId ? node : null);
  };

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const pos = nodePositions[nodeId];
    if (pos) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const clickX = (e.clientX - rect.left - transform.x) / transform.scale;
        const clickY = (e.clientY - rect.top - transform.y) / transform.scale;
        setDraggingNodeId(nodeId);
        setDragOffset({
          x: clickX - pos.x,
          y: clickY - pos.y
        });
      }
    }
  };

  const formatAmount = (num: number) => {
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
    return `$${num}`;
  };

  return (
    <div
      id="network-graph-container"
      ref={containerRef}
      className={`relative w-full ${height} bg-[#06090f] border border-slate-800 rounded-xl overflow-hidden flex flex-col select-none`}
    >
      {/* Top Controls Toolbar */}
      <div className="z-10 px-4 py-3 bg-[#080d16]/95 border-b border-slate-800/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-graph-search-account"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search account, bank or mule node..."
              className="w-full bg-[#04060a] border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Filter by bank */}
          <div className="relative">
            <select
              id="select-graph-bank-filter"
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="bg-[#04060a] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="ALL">All Banks ({banks.length})</option>
              {banks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by risk level */}
          <div className="flex items-center bg-[#04060a] p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
            {(['ALL', 'CRITICAL', 'HIGH', 'LOW'] as const).map((r) => (
              <button
                key={r}
                id={`btn-risk-filter-${r.toLowerCase()}`}
                onClick={() => setRiskFilter(r)}
                className={`px-2 py-1 rounded font-semibold transition-colors ${
                  riskFilter === r
                    ? r === 'CRITICAL'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : r === 'HIGH'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : r === 'LOW'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons & Zoom controls */}
        <div className="flex items-center gap-1.5">
          <button
            id="btn-focus-mule-network"
            onClick={handleFocusMules}
            className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors"
            title="Isolate and focus coordinated mule cluster"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Target Mule Ring</span>
          </button>

          <div className="h-5 w-px bg-slate-800 mx-1" />

          <button
            id="btn-graph-zoom-in"
            onClick={() => handleZoom(1.15)}
            className="p-1.5 rounded-lg bg-[#04060a] border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-graph-zoom-out"
            onClick={() => handleZoom(0.85)}
            className="p-1.5 rounded-lg bg-[#04060a] border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-graph-reset-view"
            onClick={handleResetView}
            className="p-1.5 rounded-lg bg-[#04060a] border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        className="relative flex-1 w-full overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          id="svg-network-canvas"
          ref={svgRef}
          className="w-full h-full"
          viewBox="0 0 1000 600"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Arrow marker for normal transfer */}
            <marker
              id="arrow-normal"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
            </marker>

            {/* Arrow marker for high-risk / mule transfer */}
            <marker
              id="arrow-mule"
              viewBox="0 0 10 10"
              refX="24"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
            </marker>

            {/* Subtle grid pattern */}
            <pattern id="cyber-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#101726" strokeWidth="0.8" />
              <circle cx="0" cy="0" r="1" fill="#1e293b" />
            </pattern>
          </defs>

          {/* Background pattern */}
          <rect id="graph-backdrop" width="100%" height="100%" fill="url(#cyber-grid)" />

          {/* Transformation Layer */}
          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
            {/* Edges Layer */}
            {filteredEdges.map((edge) => {
              const srcPos = nodePositions[edge.source];
              const tgtPos = nodePositions[edge.target];
              if (!srcPos || !tgtPos) return null;

              const isMuleRoute = edge.is_mule_route || edge.risk_score > 75;
              const isHighlight =
                connectedNodeIds === null ||
                (connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target));

              const midX = (srcPos.x + tgtPos.x) / 2;
              const midY = (srcPos.y + tgtPos.y) / 2;

              return (
                <g
                  key={edge.id}
                  id={`edge-${edge.id}`}
                  className="transition-opacity duration-300"
                  opacity={isHighlight ? 1 : 0.15}
                >
                  {/* Outer glow line if mule route */}
                  {isMuleRoute && (
                    <line
                      x1={srcPos.x}
                      y1={srcPos.y}
                      x2={tgtPos.x}
                      y2={tgtPos.y}
                      stroke="#f43f5e"
                      strokeWidth="6"
                      strokeOpacity="0.2"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Base edge line */}
                  <line
                    x1={srcPos.x}
                    y1={srcPos.y}
                    x2={tgtPos.x}
                    y2={tgtPos.y}
                    stroke={isMuleRoute ? '#f43f5e' : '#334155'}
                    strokeWidth={isMuleRoute ? '2.5' : '1.5'}
                    strokeDasharray={isMuleRoute ? '6 3' : undefined}
                    markerEnd={isMuleRoute ? 'url(#arrow-mule)' : 'url(#arrow-normal)'}
                  />

                  {/* Transfer volume label badge */}
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x="-22"
                      y="-9"
                      width="44"
                      height="18"
                      rx="4"
                      fill="#06090f"
                      stroke={isMuleRoute ? '#e11d48' : '#334155'}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fill={isMuleRoute ? '#fda4af' : '#94a3b8'}
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {formatAmount(edge.amount)}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Nodes Layer */}
            {filteredNodes.map((node) => {
              const pos = nodePositions[node.id];
              if (!pos) return null;

              const isBank = node.type === 'bank';
              const isMule = node.is_mule || node.risk_score > 75;
              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isHighlight =
                connectedNodeIds === null || connectedNodeIds.has(node.id);

              return (
                <g
                  key={node.id}
                  id={`node-${node.id}`}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer transition-transform duration-100"
                  opacity={isHighlight ? 1 : 0.25}
                  onClick={(e) => handleNodeClick(node, e)}
                  onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                >
                  {/* Mule Radar Beacon Pulse */}
                  {isMule && (
                    <circle
                      r="32"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="1.5"
                      strokeOpacity="0.4"
                      className="animate-ping origin-center"
                    />
                  )}

                  {/* Node Background & Halo */}
                  {isBank ? (
                    // Bank Institutional Box
                    <g>
                      <rect
                        x="-42"
                        y="-22"
                        width="84"
                        height="44"
                        rx="8"
                        fill="#0b1220"
                        stroke={isSelected ? '#38bdf8' : isMule ? '#f43f5e' : '#3b82f6'}
                        strokeWidth={isSelected ? '2.5' : '1.5'}
                        filter="drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5))"
                      />
                      <Building2
                        x="-34"
                        y="-12"
                        width="16"
                        height="16"
                        stroke="#60a5fa"
                      />
                      <text
                        x="-14"
                        y="1"
                        fill="#f8fafc"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {node.bank.length > 10 ? node.bank.slice(0, 8) + '..' : node.bank}
                      </text>
                      <text
                        x="-14"
                        y="12"
                        fill="#64748b"
                        fontSize="8"
                        fontFamily="monospace"
                      >
                        SETTLEMENT
                      </text>
                    </g>
                  ) : (
                    // Account Circular Node
                    <g>
                      <circle
                        r={isMule ? 22 : 18}
                        fill={isMule ? '#1f131a' : '#0c1626'}
                        stroke={
                          isSelected
                            ? '#38bdf8'
                            : isMule
                            ? '#f43f5e'
                            : node.risk_score > 50
                            ? '#f59e0b'
                            : '#10b981'
                        }
                        strokeWidth={isSelected ? '3' : isMule ? '2.5' : '1.5'}
                      />
                      {/* Risk score indicator inside circle */}
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill={isMule ? '#fda4af' : '#e2e8f0'}
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {node.risk_score}
                      </text>

                      {/* Label below */}
                      <rect
                        x="-48"
                        y="26"
                        width="96"
                        height="16"
                        rx="4"
                        fill="#04060a"
                        stroke="#1e293b"
                        strokeWidth="0.8"
                        opacity="0.9"
                      />
                      <text
                        x="0"
                        y="37"
                        textAnchor="middle"
                        fill={isMule ? '#f87171' : '#cbd5e1'}
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight={isMule ? 'bold' : 'normal'}
                      >
                        {node.label.length > 15 ? node.label.slice(0, 13) + '..' : node.label}
                      </text>

                      {/* Mule Warning Tag */}
                      {isMule && (
                        <g transform="translate(10, -18)">
                          <rect
                            x="-2"
                            y="-6"
                            width="28"
                            height="12"
                            rx="3"
                            fill="#881337"
                            stroke="#f43f5e"
                            strokeWidth="0.8"
                          />
                          <text
                            x="12"
                            y="3"
                            textAnchor="middle"
                            fill="#ffe4e6"
                            fontSize="7"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            MULE
                          </text>
                        </g>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend Overlay */}
        {showLegend && (
          <div className="absolute bottom-4 left-4 p-3 rounded-xl bg-[#090d16]/90 border border-slate-800 backdrop-blur-md text-[11px] font-mono text-slate-300 pointer-events-auto shadow-lg space-y-2 max-w-xs">
            <div className="flex items-center justify-between text-slate-400 font-bold uppercase text-[10px]">
              <span>Graph Legend</span>
              <button
                onClick={() => setShowLegend(false)}
                className="text-slate-500 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500" />
              <span>Coordinated Mule Account</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-2.5 rounded bg-blue-950 border border-blue-500" />
              <span>Institutional Bank Rail</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-0.5 border-t-2 border-dashed border-rose-500" />
              <span>High-Risk Transfer Flow</span>
            </div>
          </div>
        )}

        {/* Selected Node Details Drawer Sliding in on right */}
        {activeSelectedNode && (
          <div className="absolute top-4 right-4 bottom-4 z-20 w-80 sm:w-96">
            <NodeDetails
              node={activeSelectedNode}
              onClose={() => setSelectedNodeId(null)}
              onFilterTransactions={onFilterTransactions}
              onToggleFreeze={(nodeId) => {
                // Toggle frozen status locally
                const target = data.nodes.find((n) => n.id === nodeId);
                if (target) {
                  target.status = target.status === 'frozen' ? 'flagged' : 'frozen';
                  setSelectedNodeId(null);
                  setTimeout(() => setSelectedNodeId(nodeId), 50);
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
