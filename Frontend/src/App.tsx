import React, { useState, useEffect, useCallback } from 'react';
import {
  ActiveView,
  Transaction,
  GraphData,
  SecurityAlert,
  SystemStats
} from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoadingState } from './components/LoadingState';
import { ErrorState } from './components/ErrorState';
import { DemoController } from './components/DemoController';
import { TransactionSimulatorModal } from './components/TransactionSimulatorModal';
import { LandingPage } from './views/LandingPage';
import { DashboardView } from './views/DashboardView';
import { TransactionsView } from './views/TransactionsView';
import { NetworkView } from './views/NetworkView';
import { AlertsView } from './views/AlertsView';

export default function App() {
  const [currentView, setCurrentView] = useState<ActiveView>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isDemoControllerOpen, setIsDemoControllerOpen] = useState<boolean>(false);
  const [demoStep, setDemoStep] = useState<number>(1);

  // Initial load
  const loadData = useCallback(async (showFullLoader = true) => {
    if (showFullLoader) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const health = await api.checkHealth();
      setBackendConnected(health.backend);

      const [txList, graph, alertList, statData] = await Promise.all([
        api.getTransactions(),
        api.getGraph(),
        api.getAlerts(),
        api.getStats()
      ]);

      setTransactions(txList);
      setGraphData(graph);
      setAlerts(alertList);
      setStats(statData);

      // Default select the high-risk transaction if none selected
      if (!selectedTransaction && txList.length > 0) {
        const suspicious = txList.find((t) => t.decision === 'BLOCK') || txList[0];
        setSelectedTransaction(suspicious);
      }
    } catch (err) {
      console.error('Failed loading telemetry:', err);
      setErrorMessage('Unable to initialize connection to transaction firewall telemetry.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedTransaction]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Real-time telemetry simulation pulse (every 18 seconds an inflow occurs)
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate real-time stream pulse
      if (!backendConnected) {
        api.injectSimulatedTransaction().catch(console.error);
        api.getTransactions().then(setTransactions);
        api.getStats().then(setStats);
      }
    }, 18000);

    return () => clearInterval(interval);
  }, [backendConnected]);

  // Handle Inspect in Network Graph (e.g. from transaction details or alert)
  const handleInspectInGraph = (accountOrNodeId: string) => {
    // Find node matching label or id
    const foundNode = graphData.nodes.find(
      (n) =>
        n.id === accountOrNodeId ||
        n.label.toLowerCase().includes(accountOrNodeId.toLowerCase()) ||
        accountOrNodeId.toLowerCase().includes(n.label.toLowerCase())
    );

    const targetId = foundNode ? foundNode.id : 'acc-mule-central';
    setSelectedNodeId(targetId);
    setCurrentView('network');
  };

  // Handle Filter Transactions by Alert or Node
  const handleFilterTransactions = (accountOrBank: string) => {
    setCurrentView('transactions');
  };

  // Quick manual simulate action
  const handleQuickSimulate = () => {
    const newTx = api.injectSimulatedTransaction();
    api.getTransactions().then((list) => {
      setTransactions(list);
      setSelectedTransaction(newTx);
    });
    api.getStats().then(setStats);
  };

  // Demo step event dispatcher
  const handleSimulateDemoEvent = (step: number) => {
    if (step === 1) {
      // Baseline transactions
      api.resetToBaseline();
      loadData(false);
    } else if (step === 2) {
      // High velocity appears
      const tx = api.injectSimulatedTransaction({
        amount: 24200,
        velocity: 7.4,
        decision: 'HOLD',
        risk_score: 84,
        signals: ['HIGH VELOCITY', 'UNUSUAL BURST', 'NEW ACCOUNT']
      });
      loadData(false);
      setSelectedTransaction(tx);
    } else if (step === 3) {
      // Mule alert triggered
      setCurrentView('alerts');
    } else if (step === 4) {
      // Risk score surges
      setCurrentView('overview');
    } else if (step === 5) {
      // Real-time intervention: BLOCK
      setCurrentView('transactions');
      const blocked = transactions.find((t) => t.id === 10492) || transactions[0];
      if (blocked) setSelectedTransaction(blocked);
    } else if (step === 6) {
      // Alert investigation
      setCurrentView('alerts');
    } else if (step === 7) {
      // Network Graph reveals connected accounts
      handleInspectInGraph('acc-mule-central');
    } else if (step === 8) {
      // Explainable Signals
      setCurrentView('transactions');
      const blocked = transactions.find((t) => t.id === 10492) || transactions[0];
      if (blocked) setSelectedTransaction(blocked);
    }
  };

  if (isLoading && !stats) {
    return (
      <div className="min-h-screen bg-[#070a0f] flex items-center justify-center p-6">
        <LoadingState message="Initializing Fraudinate Firewall SOC..." />
      </div>
    );
  }

  if (errorMessage && !stats) {
    return (
      <div className="min-h-screen bg-[#070a0f] flex items-center justify-center p-6">
        <ErrorState message={errorMessage} onRetry={() => loadData(true)} />
      </div>
    );
  }

  return (
    <div id="fraudinate-app-root" className="min-h-screen bg-[#070a0f] text-slate-100 flex flex-col font-sans">
      {/* Persistent Security Header */}
      <Header
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        systemStatus={stats?.system_status || 'ONLINE'}
        backendConnected={backendConnected}
        onOpenDemoController={() => setIsDemoControllerOpen(true)}
        onSimulateTx={handleQuickSimulate}
        unreadAlertsCount={alerts.filter((a) => a.status === 'ACTIVE').length}
      />

      {/* Mobile Drawer Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        unreadAlertsCount={alerts.filter((a) => a.status === 'ACTIVE').length}
        stats={
          stats
            ? {
                processed: stats.transactions_processed,
                blocked: stats.transactions_blocked
              }
            : undefined
        }
      />

      {/* Main View Area */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 lg:px-6 py-6">
        {currentView === 'landing' && (
          <LandingPage
            onLaunchDashboard={() => setCurrentView('overview')}
            onExploreDemo={() => {
              setCurrentView('overview');
              setIsDemoControllerOpen(true);
            }}
            stats={
              stats || {
                transactions_processed: 142850,
                transactions_blocked: 1240,
                high_risk_transactions: 3180,
                suspicious_networks: 14,
                system_status: 'ONLINE',
                firewall_latency_ms: 12,
                mule_detection_rate: 99.4,
                blocked_volume_usd: 8492000
              }
            }
          />
        )}

        {currentView === 'overview' && stats && (
          <DashboardView
            stats={stats}
            transactions={transactions}
            selectedTransaction={selectedTransaction}
            onSelectTransaction={(tx) => setSelectedTransaction(tx)}
            onInspectInGraph={handleInspectInGraph}
            onRefreshFeed={() => loadData(false)}
            isRefreshing={isRefreshing}
            onOpenSimulator={() => setIsSimulatorOpen(true)}
          />
        )}

        {currentView === 'transactions' && (
          <TransactionsView
            transactions={transactions}
            selectedTransaction={selectedTransaction}
            onSelectTransaction={(tx) => setSelectedTransaction(tx)}
            onInspectInGraph={handleInspectInGraph}
            onRefresh={() => loadData(false)}
            isRefreshing={isRefreshing}
          />
        )}

        {currentView === 'network' && (
          <NetworkView
            graphData={graphData}
            selectedNodeId={selectedNodeId}
            onSelectNode={(node) => setSelectedNodeId(node ? node.id : null)}
            onFilterTransactions={handleFilterTransactions}
          />
        )}

        {currentView === 'alerts' && (
          <AlertsView
            alerts={alerts}
            onInvestigateInGraph={handleInspectInGraph}
            onFilterTransactionsByAlert={(alert) => {
              setCurrentView('transactions');
            }}
          />
        )}
      </div>

      {/* Hackathon Judge Demo Story Walkthrough Controller */}
      {isDemoControllerOpen && (
        <DemoController
          currentStep={demoStep}
          onSetStep={(step) => setDemoStep(step)}
          onClose={() => setIsDemoControllerOpen(false)}
          onNavigate={(view) => setCurrentView(view)}
          onSimulateEvent={handleSimulateDemoEvent}
        />
      )}

      {/* Manual Payload Simulator Modal (POST /api/transactions/analyze) */}
      <TransactionSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onTransactionCreated={() => {
          loadData(false);
        }}
      />
    </div>
  );
}
